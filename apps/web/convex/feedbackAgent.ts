"use node";

import { v } from "convex/values";
import type { Sandbox as SandboxType } from "tensorlake";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const SANDBOX_NAME = "feedback-agent";

const BOOTSTRAP_SCRIPT = `
set -euxo pipefail

mkdir -p /workspace
cd /workspace

if [ ! -f /workspace/.bootstrapped ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg git build-essential

  # Node 20 (for Claude Code CLI). Skip if already present.
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y --no-install-recommends nodejs
  fi

  # GitHub CLI
  if ! command -v gh >/dev/null 2>&1; then
    install -m 0755 -d /usr/share/keyrings
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | tee /usr/share/keyrings/githubcli-archive-keyring.gpg >/dev/null
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
    arch="$(dpkg --print-architecture)"
    echo "deb [arch=$arch signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list
    apt-get update
    apt-get install -y --no-install-recommends gh
  fi

  # Claude Code CLI
  npm install -g @anthropic-ai/claude-code

  git config --global user.email "feedback-bot@nozomio.local"
  git config --global user.name "Nozomio Feedback Bot"
  git config --global init.defaultBranch main

  touch /workspace/.bootstrapped
fi

claude --version
gh --version
node --version
git --version
echo "BOOTSTRAP_OK"
`;

const RUN_SCRIPT = `
set -euo pipefail

: "\${ANTHROPIC_API_KEY:?missing}"
: "\${GITHUB_TOKEN:?missing}"
: "\${REPO:?missing}"
: "\${BRANCH:?missing}"
: "\${TITLE:?missing}"
: "\${FEEDBACK_PROMPT:?missing}"

WORKDIR="/workspace/run-\${BRANCH//\\//-}"
rm -rf "$WORKDIR"
git clone --depth=1 "https://x-access-token:\${GITHUB_TOKEN}@github.com/\${REPO}.git" "$WORKDIR"
cd "$WORKDIR"
git checkout -b "$BRANCH"

SYSTEM_GUARD="You are an autonomous coding agent for the nozomio-hackathon repo (Next.js + Convex + bun monorepo). Implement the user's feedback below as a small, focused change. Hard constraints: do NOT modify files under .github/, do NOT change CI config, do NOT touch authentication secrets or .env files, do NOT delete unrelated files, do NOT run dev servers, do NOT push or create PRs (a wrapper script handles git/PR). Keep the diff minimal and focused."

set +e
claude -p "$FEEDBACK_PROMPT" \\
  --append-system-prompt "$SYSTEM_GUARD" \\
  --permission-mode bypassPermissions \\
  --allowedTools "Read,Edit,Write,Bash,Glob,Grep" \\
  --max-turns 25 \\
  --output-format json > /tmp/claude-result.json 2> /tmp/claude-stderr.log
CLAUDE_EXIT=$?
set -e

if [ "$CLAUDE_EXIT" -ne 0 ]; then
  echo "CLAUDE_FAILED exit=$CLAUDE_EXIT" >&2
  tail -c 4000 /tmp/claude-stderr.log >&2 || true
  exit 50
fi

git add -A
if git diff --cached --quiet; then
  echo "NO_CHANGES" >&2
  exit 42
fi

git -c user.email=feedback-bot@nozomio.local -c user.name="Nozomio Feedback Bot" \\
  commit -m "feedback: \${TITLE}"

git push -u origin "$BRANCH"

PR_URL=$(GH_TOKEN="$GITHUB_TOKEN" gh pr create \\
  --head "$BRANCH" \\
  --base main \\
  --title "feedback: \${TITLE}" \\
  --body "Automated PR from in-app feedback.

---

\${FEEDBACK_PROMPT}")

echo "PR_URL=\${PR_URL}"
echo "----CLAUDE_JSON----"
cat /tmp/claude-result.json
`;

type ClaudeResult = {
  session_id?: string;
  total_cost_usd?: number;
  is_error?: boolean;
  result?: string;
};

function extractPrUrl(stdout: string): string | null {
  const lines = stdout.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && line.startsWith("PR_URL=")) {
      const url = line.slice("PR_URL=".length).trim();
      if (url.length > 0) return url;
    }
  }
  return null;
}

function extractClaudeJson(stdout: string): ClaudeResult | null {
  const marker = "----CLAUDE_JSON----";
  const idx = stdout.lastIndexOf(marker);
  if (idx < 0) return null;
  const rest = stdout.slice(idx + marker.length).trim();
  if (rest.length === 0) return null;
  try {
    return JSON.parse(rest) as ClaudeResult;
  } catch {
    return null;
  }
}

async function getOrCreateWarmSandbox(): Promise<SandboxType> {
  const { Sandbox } = await import("tensorlake");
  const list = await Sandbox.list();
  const existing = list.find(
    (s) =>
      s.name === SANDBOX_NAME &&
      String(s.status).toLowerCase() !== "terminated",
  );

  if (existing !== undefined) {
    try {
      const sandbox = await Sandbox.connect({ sandboxId: existing.sandboxId });
      const status = String(await sandbox.status()).toLowerCase();
      if (status === "suspended" || status === "suspending") {
        await sandbox.resume();
      }
      return sandbox;
    } catch (err) {
      console.warn(
        "Failed to resume existing sandbox, creating fresh:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return await Sandbox.create({
    name: SANDBOX_NAME,
    cpus: 2,
    memoryMb: 4096,
    diskMb: 20480,
    timeoutSecs: 540,
  });
}

export const processFeedback = internalAction({
  args: {
    id: v.id("feedback"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const repo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const tensorlakeKey = process.env.TENSORLAKE_API_KEY;

    if (!repo || !githubToken || !anthropicKey || !tensorlakeKey) {
      const missing = [
        !repo && "GITHUB_REPO",
        !githubToken && "GITHUB_TOKEN",
        !anthropicKey && "ANTHROPIC_API_KEY",
        !tensorlakeKey && "TENSORLAKE_API_KEY",
      ]
        .filter(Boolean)
        .join(", ");
      await ctx.runMutation(internal.feedback._setFailed, {
        id: args.id,
        errorMessage: `Server misconfigured: missing env ${missing}`,
      });
      return null;
    }

    const feedback = await ctx.runQuery(internal.feedback._getFeedback, {
      id: args.id,
    });
    if (feedback === null) {
      console.warn("processFeedback: row not found", args.id);
      return null;
    }

    const branch = `feedback/${args.id}-${Math.floor(Date.now() / 1000)}`;

    let sandbox: SandboxType | null = null;
    try {
      sandbox = await getOrCreateWarmSandbox();

      await ctx.runMutation(internal.feedback._setRunning, {
        id: args.id,
        sandboxId: sandbox.sandboxId,
        branch,
      });

      const bootstrap = await sandbox.run("bash", {
        args: ["-lc", BOOTSTRAP_SCRIPT],
        timeout: 300,
      });
      if (bootstrap.exitCode !== 0) {
        const tail =
          (bootstrap.stderr || "").slice(-2000) ||
          (bootstrap.stdout || "").slice(-2000);
        await ctx.runMutation(internal.feedback._setFailed, {
          id: args.id,
          errorMessage: `Bootstrap failed (exit ${bootstrap.exitCode}): ${tail}`,
          branch,
        });
        return null;
      }

      const result = await sandbox.run("bash", {
        args: ["-lc", RUN_SCRIPT],
        env: {
          ANTHROPIC_API_KEY: anthropicKey,
          GITHUB_TOKEN: githubToken,
          GH_TOKEN: githubToken,
          REPO: repo,
          BRANCH: branch,
          TITLE: feedback.title,
          FEEDBACK_PROMPT: feedback.body,
        },
        timeout: 480,
      });

      const stdout = result.stdout ?? "";
      const stderr = result.stderr ?? "";

      if (result.exitCode === 42) {
        await ctx.runMutation(internal.feedback._setFailed, {
          id: args.id,
          errorMessage: "Claude made no code changes for this feedback.",
          branch,
        });
        return null;
      }

      if (result.exitCode !== 0) {
        const tail = stderr.slice(-3000) || stdout.slice(-3000);
        await ctx.runMutation(internal.feedback._setFailed, {
          id: args.id,
          errorMessage: `Run failed (exit ${result.exitCode}): ${tail}`,
          branch,
        });
        return null;
      }

      const prUrl = extractPrUrl(stdout);
      if (prUrl === null) {
        await ctx.runMutation(internal.feedback._setFailed, {
          id: args.id,
          errorMessage: `Could not parse PR URL from output. Tail: ${stdout.slice(
            -1500,
          )}`,
          branch,
        });
        return null;
      }

      const claudeJson = extractClaudeJson(stdout);
      await ctx.runMutation(internal.feedback._setSucceeded, {
        id: args.id,
        prUrl,
        branch,
        claudeSessionId: claudeJson?.session_id,
        totalCostUsd: claudeJson?.total_cost_usd,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.feedback._setFailed, {
        id: args.id,
        errorMessage: `Action error: ${msg}`,
        branch,
      });
    } finally {
      if (sandbox !== null) {
        try {
          await sandbox.suspend();
        } catch (err) {
          console.warn(
            "Failed to suspend sandbox:",
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    }
    return null;
  },
});
