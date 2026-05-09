# Linelight — a basic Linear clone

A minimal Linear-style issue tracker built on:

- **Next.js 16** App Router (`apps/web`)
- **Convex** (cloud) for the database and reactive backend (`apps/web/convex`)
- **WorkOS AuthKit** for authentication via `@workos-inc/authkit-nextjs` and `@convex-dev/workos`
- **shadcn/ui** components in `packages/ui` (sidebar, dialog, field, select, etc.)
- **Hugeicons** for the icon set

## What's in it

- One implicit workspace, no team management
- Issues with title, description, status (Backlog / Todo / In Progress / Done / Cancelled),
  priority (No priority / Urgent / High / Medium / Low), and assignee
- Sidebar shell, status-grouped issues list (`/inbox`, `/issues`, `/issues/mine`),
  issue detail with inline-editable title and description, and a "New issue" dialog
- Dark/light theme toggle (press `d` to flip)

## Run locally

You will need a free [Convex](https://convex.dev) account. WorkOS keys are auto-provisioned
the first time `npx convex dev` runs (Convex-managed WorkOS team) — or you can supply your own.

1. Install deps from the repo root:

   ```bash
   bun install
   ```

2. Inside `apps/web`, copy the env example:

   ```bash
   cd apps/web
   cp .env.local.example .env.local
   ```

3. Start Convex against the cloud (it will populate `NEXT_PUBLIC_CONVEX_URL` and
   walk you through the AuthKit onboarding the first time):

   ```bash
   npx convex dev
   ```

4. If you're _not_ using a Convex-managed WorkOS team, set `WORKOS_CLIENT_ID`,
   `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, and `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
   in `.env.local`, then also push them to Convex:

   ```bash
   npx convex env set WORKOS_CLIENT_ID "$WORKOS_CLIENT_ID"
   npx convex env set WORKOS_API_KEY  "$WORKOS_API_KEY"
   ```

5. In another terminal, from the repo root, start the web app:

   ```bash
   bun dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), sign up via WorkOS, and you'll
   land on `/inbox`.

## Adding shadcn components

```bash
bunx --bun shadcn@latest add -c apps/web <component>
```

Components are placed under `packages/ui/src/components/` per `apps/web/components.json`.

## Feedback-to-PR agent

The bottom-right "Feedback" button submits a Convex mutation that schedules an internal
action (`apps/web/convex/feedbackAgent.ts`). The action spins up (or resumes) a named
Tensorlake sandbox called `feedback-agent`, clones this repo over HTTPS with a GitHub PAT,
runs Claude Code CLI in headless mode (`claude -p ... --permission-mode bypassPermissions`)
on a branch named `feedback/<id>-<unix>`, then commits, pushes, and opens a PR against `main`.
After each run the sandbox is `suspend()`ed so the next submission resumes warm.

### Services to sign up for

- [Anthropic](https://console.anthropic.com/) — `ANTHROPIC_API_KEY`
- [Tensorlake](https://cloud.tensorlake.ai/) — `TENSORLAKE_API_KEY`
- [GitHub fine-grained PAT](https://github.com/settings/tokens?type=beta) scoped to **only**
  `ReedG20/nozomio-hackathon`. Permissions: `Contents: read/write`,
  `Pull requests: read/write`, `Metadata: read`. Do **not** grant `Workflows`,
  `Administration`, or `Actions` — keeps blast radius small if a prompt injection escapes.

### Push the keys to Convex

These are read server-side from the Convex action; they are never exposed to the browser.

```bash
npx convex env set ANTHROPIC_API_KEY  "$ANTHROPIC_API_KEY"
npx convex env set TENSORLAKE_API_KEY "$TENSORLAKE_API_KEY"
npx convex env set GITHUB_TOKEN       "$GITHUB_TOKEN"
npx convex env set GITHUB_REPO        "ReedG20/nozomio-hackathon"
```

Recommended: enable branch protection on `main` (require PR review, no direct push) so the
agent's PAT can never bypass review.
