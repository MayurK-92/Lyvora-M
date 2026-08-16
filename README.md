# Lyvora

> Everything worth remembering, remembered.

Lyvora is an AI-powered personal memory. Paste a link, a note, a PDF, or an image — it reads the content, extracts structured knowledge, and makes it searchable later. You do not file things into folders. You ask for them back.

Spec and architecture: [`docs/Lyvora_prd.md`](docs/Lyvora_prd.md), [`docs/system_design.md`](docs/system_design.md).

## What works today

Sign in, open `/home`, and save something. The capture is stored first, then Inngest runs Gemini in the background. A live card shows progress until you have a titled, summarized, categorized memory.

From there you can:

- **Capture** — public web URLs, YouTube, Instagram, pasted text, PDF, and images
- **Search** — natural-language hybrid search (semantic + keyword) with category, tag, and type filters
- **Chat** — ask questions over your own memories, with inline citations
- **Graph** — entities and relationships extracted from what you save
- **Reports** — weekly recap in the app (email is optional; needs Resend)

Also included: PWA share target, a bookmarklet and iOS shortcut from Settings, and a short first-run onboarding card.

## Stack

Next.js 16 (App Router) · TypeScript · Supabase (Auth, Postgres, pgvector, Storage, Realtime) · Inngest · Gemini (`gemini-3.5-flash-lite` + `gemini-embedding-001`) · Tailwind v4

## Prerequisites

- Node.js 20.9+ (the repo is developed on 22.x)
- [pnpm](https://pnpm.io) 10+ (`corepack enable` or `npm i -g pnpm`)
- A free [Supabase](https://supabase.com) project
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key

## Setup (hosted Supabase)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (any region, Free plan).
2. **SQL Editor** → run every migration in order:

   - [`0001_init.sql`](supabase/migrations/0001_init.sql)
   - [`0002_captures_memories.sql`](supabase/migrations/0002_captures_memories.sql)
   - [`0003_realtime_replica_identity.sql`](supabase/migrations/0003_realtime_replica_identity.sql)
   - [`0004_storage_captures.sql`](supabase/migrations/0004_storage_captures.sql)
   - [`0005_search_m3.sql`](supabase/migrations/0005_search_m3.sql)
   - [`0006_chat_m4.sql`](supabase/migrations/0006_chat_m4.sql)
   - [`0007_graph_m5.sql`](supabase/migrations/0007_graph_m5.sql)
   - [`0008_reports_m6.sql`](supabase/migrations/0008_reports_m6.sql)

3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/callback`
4. Copy secrets into `apps/web/.env.local` (template: [`.env.example`](.env.example)):

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
INNGEST_DEV=1
```

Use the session/transaction **pooler** URI for `SUPABASE_DB_URL`. Service role and the DB URL are worker-only — never expose them to the client.

```bash
pnpm install
pnpm dev
```

In a second terminal, sync Inngest to the Next.js app:

```bash
pnpm inngest:dev
```

Open `http://localhost:3000`, sign in with a magic link, go to `/home`, and paste a public blog URL. Within about 30 seconds the skeleton card should become a titled, summarized, categorized memory. Then try Search or Chat on that save.

Google sign-in is wired in the UI. It stays disabled until you add a Google OAuth client under **Authentication → Providers**.

### Optional: weekly report email

Leave these unset and reports still generate in `/report`. Set them to also send Monday email via [Resend](https://resend.com):

```bash
RESEND_API_KEY=re_...
RESEND_FROM="Lyvora <reports@yourdomain.com>"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional: fully local Supabase (Docker)

```bash
pnpm supabase:start   # Docker Desktop + free disk on the Docker data drive
```

Copy the printed API URL and anon/service keys into `apps/web/.env.local`. Magic-link emails land in Mailpit at `http://127.0.0.1:54324`.

## Monorepo

```
apps/web/            Next.js app — UI, API routes, auth, Inngest functions
packages/core/       Drizzle schema, Zod contracts, capture / search / chat / graph / reports
packages/ui/         Shared UI primitives (Tailwind v4)
packages/config/     Shared tsconfig, ESLint, design tokens
supabase/migrations/ SQL migrations (SQL Editor or Supabase CLI)
docs/                PRD and system design
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js app at `http://localhost:3000` |
| `pnpm inngest:dev` | Inngest Dev Server → `http://localhost:3000/api/inngest` |
| `pnpm build` | Production build |
| `pnpm lint` / `pnpm typecheck` | Lint / typecheck every package |
| `pnpm supabase:start` / `supabase:stop` | Local Supabase stack |
| `pnpm supabase:gen-types` | Regenerate `packages/core/src/db/database.types.ts` |
| `pnpm db:studio` | Drizzle Studio |

Eval scripts for search, chat, graph, and reports live under `packages/core/scripts/` (`eval-search.ts`, `eval-chat.ts`, `eval-graph.ts`, `eval-report.ts`). They are not wired to `pnpm test` yet.
