# Haydee — Claude Code Reference

AI-powered co-pilot for literary translators. Helps manage 80K–200K word book translation projects: character tracking, terminology management, cultural adaptation flagging, and voice profiling. The AI suggests; the translator decides.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| Styling | Tailwind CSS — system fonts only, no custom fonts |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password) |
| AI | Anthropic Claude Sonnet (`@anthropic-ai/sdk`) |
| Async Jobs | Inngest (background job queue) |
| Payments | Stripe |
| Icons | Tabler Icons (`@tabler/icons-react`, `ti-` prefix) |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          — Login, signup pages
│   ├── (dashboard)/     — All authenticated pages
│   │   └── projects/[projectId]/
│   │       ├── page.tsx             — Project overview
│   │       ├── manuscript/page.tsx  — Manuscript view (read-only)
│   │       ├── characters/page.tsx  — Character registry
│   │       ├── glossary/page.tsx    — Glossary manager
│   │       ├── culture-queue/page.tsx
│   │       └── author-qa/page.tsx
│   └── api/v1/          — All API routes
├── components/
│   ├── ui/              — Primitives: Button, Badge, Modal, Spinner, Toast
│   ├── layout/          — Sidebar, Topbar, MainLayout
│   ├── dashboard/
│   ├── manuscript/
│   ├── characters/
│   ├── glossary/
│   ├── culture-queue/
│   └── author-qa/
├── hooks/               — useAuth, useProject, useFlags, useApi, etc.
├── lib/
│   ├── supabase/        — client.ts (browser), server.ts (RSC)
│   ├── anthropic/       — client.ts + jobs/ + prompts/
│   ├── inngest/         — client.ts + functions/
│   ├── stripe/          — client.ts
│   └── api/             — response.ts, auth.ts, errors.ts
└── types/               — database.ts, api.ts, ai.ts
supabase/
└── migrations/          — 0001–0013 SQL migration files
```

---

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run db:types     # Regenerate Supabase TypeScript types
```

---

## API Convention

All routes live under `/api/v1/`. Every response uses this wrapper:

```ts
{ success: boolean, data: T | null, error: { message: string } | null, timestamp: string }
```

Use helpers from `src/lib/api/response.ts`:
```ts
return apiSuccess(data)           // 200
return apiError('Not found', 404) // error
```

Authenticate every route with `requireAuth()` from `src/lib/api/auth.ts`.

---

## Database

11 tables: `users`, `projects`, `manuscripts`, `chunks`, `project_memory`, `characters`, `glossary_terms`, `flags`, `author_questions`, `ai_call_log`, `stripe_events`

RLS is **always on**. Every query is user-scoped via Supabase RLS — never bypass with service role in user-facing routes.

Use the server client (`src/lib/supabase/server.ts`) in API routes and Server Components. Use the browser client (`src/lib/supabase/client.ts`) in Client Components only.

TypeScript types are in `src/types/database.ts` — regenerate after schema changes with `npm run db:types`.

---

## AI Jobs (Inngest + Anthropic)

Five background jobs, all dispatched via Inngest (never block HTTP responses with AI calls):

| Job | Trigger | Purpose |
|---|---|---|
| `job-1-ingest` | After manuscript upload | Extract characters, glossary, culture flags, untranslatable passages from full text |
| `job-2-character-profile` | On-demand per character | Generate 3 tone descriptors with evidence quotes |
| `job-3-culture-flags` | Ingestion or on-demand per chapter | Find culturally non-portable passages, severity-ranked |
| `job-4-consistency-check` | On-demand per chapter | Scan translator's draft for name/term drift |
| `job-5-untranslatable` | Ingestion or on-demand per chapter | Find passages where form matters (wordplay, puns, dialect) |

All AI calls must log to `ai_call_log` table (tokens, cost, model).

Cost formula (Claude Sonnet): `(input_tokens * 3 + output_tokens * 15) / 1_000_000` USD

Inngest webhook: `/api/webhooks/inngest`

---

## Design System

### Colors
```
Brand:   #534AB7  (primary actions, active states)
Success: #1D9E75  (approved, done)
Danger:  #E24B4A  (errors, consistency flags)
Warning: #E8A838  (culture flags)
Info:    #0C447C  (informational)
```

### Flag highlight colors (manuscript view)
- `consistency` → red `#E24B4A` at 12% opacity + underline
- `culture` → amber `#E8A838` at 12% opacity + underline
- `untranslatable` → purple `#534AB7` at 12% opacity + underline
- `glossary` → green `#1D9E75` at 12% opacity + underline

### Typography (system fonts only)
- Page title: `text-[20px] font-semibold`
- Section: `text-[15px] font-medium`
- Body: `text-[14px]`
- Prose (manuscript): `text-[15px] leading-loose max-w-[680px]`
- Metadata: `text-[12px] text-gray-500`
- Label: `text-[11px] font-medium uppercase tracking-wide`

### Sidebar
- Collapsed: `w-14` (56px), icons only
- Hover expanded: `w-50` (200px), icon + label
- Transition: `duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)]`

### Animations
- Quick interactions: 150ms
- Panel slide-in: 220ms cubic-bezier(.4,0,.2,1)
- Never over 400ms

---

## Key Rules

1. **App Router only** — never use Pages Router patterns (`getServerSideProps`, `pages/api/`)
2. **No custom fonts** — system font stack in Tailwind only
3. **Tabler Icons only** — import from `@tabler/icons-react`
4. **Manuscript view is read-only** — translators write in their own tools (Word, Scrivener)
5. **AI is async** — all AI work goes through Inngest, never blocks HTTP
6. **RLS always on** — never bypass with service role for user-facing queries
7. **Standard response wrapper** — every API route uses `apiSuccess`/`apiError`
8. **Zod validation** — validate all API input at the route boundary
9. **Soft deletes** — projects set to `status = 'archived'`, never hard deleted
10. **Cost logging** — every Anthropic API call inserts a row into `ai_call_log`
11. **Always update CLAUDE.md** — when a phase completes, mark it done in Phase Progress; when a key architectural decision is made, add it here

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase public anon key
SUPABASE_SERVICE_ROLE_KEY=          # Server-only service role key
ANTHROPIC_API_KEY=                  # Server-only
INNGEST_EVENT_KEY=                  # Inngest event sending key
INNGEST_SIGNING_KEY=                # Inngest webhook verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Public Stripe key
STRIPE_SECRET_KEY=                  # Server-only Stripe key
STRIPE_WEBHOOK_SECRET=              # Stripe webhook signature secret
NEXT_PUBLIC_APP_URL=                # Full app URL (e.g. http://localhost:3000)
```

---

## Phase Progress

- [x] Phase 0 — Setup & scaffolding
- [x] Phase 1 — Database schema (11 tables + RLS + auth trigger)
- [x] Phase 2 — Authentication
- [x] Phase 3 — Core API routes (23 routes across projects, chapters, characters, glossary, flags, culture-queue, author-questions, dashboard, webhooks)
- [x] Phase 4 — Frontend foundation (UI primitives, layout)
- [x] Phase 5 — Dashboard & onboarding (dashboard, projects list, project overview, 3-step wizard, 5 feature stubs)
- [x] Phase 6 — Feature pages (manuscript view, character registry, glossary manager, culture queue, author Q&A)
- [x] Phase 7 — AI integration (5 Inngest jobs via LangGraph + Claude Sonnet)
- [ ] Phase 8 — Polish & deploy
