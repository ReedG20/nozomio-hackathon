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
