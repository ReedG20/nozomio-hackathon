"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const SANDBOX_NAME = "feedback-agent";
const TENSORLAKE_API = "https://api.tensorlake.ai";

const BOOTSTRAP_SCRIPT = `
set -euxo pipefail

mkdir -p /workspace
cd /workspace

if [ ! -f /workspace/.bootstrapped ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg git build-essential

  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y --no-install-recommends nodejs
  fi

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
  --max-turns 80 \\
  --max-budget-usd 2.0 \\
  --output-format json > /tmp/claude-result.json 2> /tmp/claude-stderr.log
CLAUDE_EXIT=$?
set -e

git add -A
if git diff --cached --quiet; then
  if [ "$CLAUDE_EXIT" -ne 0 ]; then
    echo "CLAUDE_FAILED exit=$CLAUDE_EXIT" >&2
    echo "----CLAUDE_STDERR----" >&2
    tail -c 4000 /tmp/claude-stderr.log >&2 || true
    echo "----CLAUDE_STDOUT----" >&2
    tail -c 4000 /tmp/claude-result.json >&2 || true
    exit 50
  fi
  echo "NO_CHANGES" >&2
  exit 42
fi

if [ "$CLAUDE_EXIT" -ne 0 ]; then
  echo "CLAUDE_PARTIAL exit=$CLAUDE_EXIT - committing partial changes anyway" >&2
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

type SandboxInfo = {
  id: string;
  name?: string | null;
  status: string;
};

type RawSandboxResponse = {
  id?: string;
  sandbox_id?: string;
  sandboxId?: string;
  name?: string | null;
  status: string;
};

function normalizeSandbox(raw: RawSandboxResponse): SandboxInfo {
  const id = raw.id ?? raw.sandbox_id ?? raw.sandboxId;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(
      `Tensorlake response missing sandbox id: ${JSON.stringify(raw)}`,
    );
  }
  return { id, name: raw.name ?? null, status: raw.status };
}

type ProcessInfo = {
  pid: number;
  status: string;
  exit_code: number | null;
  signal: string | null;
  command: string;
  args: string[];
  started_at?: number;
  ended_at?: number | null;
};

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
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

class TensorlakeClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...(extra ?? {}),
    };
  }

  async getSandbox(idOrName: string): Promise<SandboxInfo | null> {
    const res = await fetch(
      `${TENSORLAKE_API}/sandboxes/${encodeURIComponent(idOrName)}`,
      { headers: this.headers() },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tensorlake getSandbox failed (${res.status}): ${text}`);
    }
    return normalizeSandbox((await res.json()) as RawSandboxResponse);
  }

  async createSandbox(opts: {
    name?: string;
    cpus?: number;
    memoryMb?: number;
    diskMb?: number;
    timeoutSecs?: number;
  }): Promise<SandboxInfo> {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.cpus || opts.memoryMb || opts.diskMb) {
      body.resources = {
        ...(opts.cpus !== undefined ? { cpus: opts.cpus } : {}),
        ...(opts.memoryMb !== undefined ? { memory_mb: opts.memoryMb } : {}),
        ...(opts.diskMb !== undefined ? { disk_mb: opts.diskMb } : {}),
      };
    }
    if (opts.timeoutSecs !== undefined) body.timeout_secs = opts.timeoutSecs;

    const res = await fetch(`${TENSORLAKE_API}/sandboxes`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Tensorlake createSandbox failed (${res.status}): ${text}`,
      );
    }
    return normalizeSandbox((await res.json()) as RawSandboxResponse);
  }

  async resume(idOrName: string): Promise<void> {
    const res = await fetch(
      `${TENSORLAKE_API}/sandboxes/${encodeURIComponent(idOrName)}/resume`,
      { method: "POST", headers: this.headers() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tensorlake resume failed (${res.status}): ${text}`);
    }
  }

  async suspend(idOrName: string): Promise<void> {
    const res = await fetch(
      `${TENSORLAKE_API}/sandboxes/${encodeURIComponent(idOrName)}/suspend`,
      { method: "POST", headers: this.headers() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tensorlake suspend failed (${res.status}): ${text}`);
    }
  }

  private proxyUrl(idOrName: string, path: string): string {
    return `https://${idOrName}.sandbox.tensorlake.ai${path}`;
  }

  async startProcess(
    sandboxId: string,
    body: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      working_dir?: string;
    },
  ): Promise<ProcessInfo> {
    const res = await fetch(this.proxyUrl(sandboxId, "/api/v1/processes"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Tensorlake startProcess failed (${res.status}): ${text}`,
      );
    }
    return (await res.json()) as ProcessInfo;
  }

  async getProcess(sandboxId: string, pid: number): Promise<ProcessInfo> {
    const res = await fetch(
      this.proxyUrl(sandboxId, `/api/v1/processes/${pid}`),
      { headers: this.headers() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tensorlake getProcess failed (${res.status}): ${text}`);
    }
    return (await res.json()) as ProcessInfo;
  }

  async getOutput(
    sandboxId: string,
    pid: number,
    stream: "stdout" | "stderr",
  ): Promise<string> {
    const res = await fetch(
      this.proxyUrl(sandboxId, `/api/v1/processes/${pid}/${stream}`),
      { headers: this.headers() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Tensorlake getOutput(${stream}) failed (${res.status}): ${text}`,
      );
    }
    const data = (await res.json()) as { lines?: string[] };
    return (data.lines ?? []).join("\n");
  }

  async runToCompletion(
    sandboxId: string,
    body: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      working_dir?: string;
    },
    options: { timeoutMs: number; pollMs?: number },
  ): Promise<RunResult> {
    const proc = await this.startProcess(sandboxId, body);
    const start = Date.now();
    const pollMs = options.pollMs ?? 2000;
    let info: ProcessInfo = proc;
    while (info.status === "running" || info.status === "pending") {
      if (Date.now() - start > options.timeoutMs) {
        try {
          await fetch(
            this.proxyUrl(
              sandboxId,
              `/api/v1/processes/${proc.pid}/kill`,
            ),
            { method: "POST", headers: this.headers() },
          );
        } catch {
          /* ignore */
        }
        throw new Error(
          `Process ${proc.pid} timed out after ${options.timeoutMs}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, pollMs));
      info = await this.getProcess(sandboxId, proc.pid);
    }
    const [stdout, stderr] = await Promise.all([
      this.getOutput(sandboxId, proc.pid, "stdout"),
      this.getOutput(sandboxId, proc.pid, "stderr"),
    ]);
    return {
      exitCode: info.exit_code ?? -1,
      stdout,
      stderr,
    };
  }
}

async function getOrCreateWarmSandbox(
  client: TensorlakeClient,
): Promise<SandboxInfo> {
  let info: SandboxInfo | null = null;
  try {
    info = await client.getSandbox(SANDBOX_NAME);
  } catch (err) {
    console.warn(
      "getSandbox by name failed, will try create:",
      err instanceof Error ? err.message : String(err),
    );
  }

  if (info !== null && info.status.toLowerCase() !== "terminated") {
    const status = info.status.toLowerCase();
    if (status === "suspended" || status === "suspending") {
      await client.resume(info.id);
    }
    while (true) {
      const fresh = await client.getSandbox(info.id);
      if (fresh === null) break;
      const s = fresh.status.toLowerCase();
      if (s === "running") return fresh;
      if (s === "terminated") break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const created = await client.createSandbox({
    name: SANDBOX_NAME,
    cpus: 2,
    memoryMb: 4096,
    diskMb: 20480,
    timeoutSecs: 540,
  });
  while (true) {
    const fresh = await client.getSandbox(created.id);
    if (fresh === null) {
      throw new Error("Sandbox disappeared after create");
    }
    if (fresh.status.toLowerCase() === "running") return fresh;
    if (fresh.status.toLowerCase() === "terminated") {
      throw new Error("Sandbox terminated before becoming ready");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export const processFeedback = internalAction({
  args: {
    id: v.id("feedback"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("processFeedback: start", { id: args.id });
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
      console.error("processFeedback: missing env", missing);
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
    const client = new TensorlakeClient(tensorlakeKey);

    let sandboxId: string | null = null;
    try {
      console.log("processFeedback: acquiring sandbox");
      const info = await getOrCreateWarmSandbox(client);
      sandboxId = info.id;
      console.log("processFeedback: sandbox ready", { sandboxId });

      await ctx.runMutation(internal.feedback._setRunning, {
        id: args.id,
        sandboxId,
        branch,
      });

      console.log("processFeedback: running bootstrap");
      const bootstrap = await client.runToCompletion(
        sandboxId,
        { command: "bash", args: ["-lc", BOOTSTRAP_SCRIPT] },
        { timeoutMs: 5 * 60 * 1000 },
      );
      console.log("processFeedback: bootstrap done", {
        exitCode: bootstrap.exitCode,
      });
      if (bootstrap.exitCode !== 0) {
        const tail =
          bootstrap.stderr.slice(-2000) || bootstrap.stdout.slice(-2000);
        console.error("processFeedback: bootstrap failed", tail);
        await ctx.runMutation(internal.feedback._setFailed, {
          id: args.id,
          errorMessage: `Bootstrap failed (exit ${bootstrap.exitCode}): ${tail}`,
          branch,
        });
        return null;
      }

      console.log("processFeedback: running claude agent", { repo, branch });
      const result = await client.runToCompletion(
        sandboxId,
        {
          command: "bash",
          args: ["-lc", RUN_SCRIPT],
          env: {
            ANTHROPIC_API_KEY: anthropicKey,
            GITHUB_TOKEN: githubToken,
            GH_TOKEN: githubToken,
            REPO: repo,
            BRANCH: branch,
            TITLE: feedback.title,
            FEEDBACK_PROMPT: feedback.body,
            // Required to allow `--permission-mode bypassPermissions`
            // (a.k.a. --dangerously-skip-permissions) to run as root inside
            // the Tensorlake sandbox. Undocumented but supported by
            // @anthropic-ai/claude-code across versions.
            IS_SANDBOX: "1",
          },
        },
        { timeoutMs: 8 * 60 * 1000 },
      );
      console.log("processFeedback: claude run done", {
        exitCode: result.exitCode,
      });

      const { stdout, stderr } = result;

      if (result.exitCode === 42) {
        console.warn("processFeedback: no changes from claude");
        await ctx.runMutation(internal.feedback._setFailed, {
          id: args.id,
          errorMessage: "Claude made no code changes for this feedback.",
          branch,
        });
        return null;
      }

      if (result.exitCode !== 0) {
        const tail = stderr.slice(-3000) || stdout.slice(-3000);
        console.error(
          "processFeedback: run failed",
          { exitCode: result.exitCode },
          tail,
        );
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
      const stack = err instanceof Error ? err.stack : undefined;
      console.error("processFeedback: caught error", msg, stack);
      await ctx.runMutation(internal.feedback._setFailed, {
        id: args.id,
        errorMessage: `Action error: ${msg}`,
        branch,
      });
    } finally {
      if (sandboxId !== null) {
        try {
          await client.suspend(sandboxId);
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
