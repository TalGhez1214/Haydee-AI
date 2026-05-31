# Haydee — AI Co-Pilot for Literary Translators

> An intelligent workspace for professional book translators. Haydee handles the groundwork — character tracking, terminology management, cultural analysis, and consistency checking — so translators can focus on craft.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)
![Anthropic Claude](https://img.shields.io/badge/Claude-Sonnet%203.5-D97757?style=flat-square&logo=anthropic&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.3-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Inngest](https://img.shields.io/badge/Inngest-async%20jobs-5D5FEF?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## What is Haydee?

Haydee is a full-stack SaaS application built for professional literary translators working on 80K–200K word book projects. When a translator uploads a manuscript, Haydee's AI pipeline automatically extracts characters, flags culturally non-portable passages, builds a terminology glossary, and generates a project to-do list — all before the translator writes a single word.

**The AI suggests. The translator decides.**

---

## AI & LLM Integration

This is the core of Haydee. All AI work runs asynchronously through an [Inngest](https://www.inngest.com/) job queue using [LangChain LangGraph](https://langchain-ai.github.io/langgraphjs/) state machines backed by **Anthropic Claude Sonnet 3.5**.

### 5 Automated AI Pipelines

#### Job 1 — Manuscript Ingestion (auto-triggered on upload)

The centerpiece pipeline. Parses the uploaded manuscript (DOCX via Mammoth, EPUB via jszip + OPF manifest, TXT native), splits it into chapters, then runs a **LangChain StateGraph** across the full text:

```
Load project metadata
    → Load chapter chunks
        → Analyze each chapter (structured LLM call)
            → Merge + deduplicate across chapters
                → Persist to database
                    → Log AI costs
                        → Dispatch Job 2 per character
```

Every LLM call uses a **Zod schema** for strict structured output — no free-form text escapes into the database. The prompt includes project metadata (title, author, source/target languages, genre, style guide) alongside the chapter text. Output schema:

```typescript
{
  characters: { name, name_variants, role, first_appearance_quote }[]
  glossary_candidates: { source_term, term_type, context, frequency }[]
  culture_flags: { passage, flag_type, severity, explanation, suggestions[] }[]
  untranslatable_passages: { passage, type, explanation, strategies[] }[]
  chapter_summary: string
}
```

#### Job 2 — Character Voice Profiling (per-character, on-demand)

Scans all chapter chunks for mentions of a given character, extracts tone markers and contextual passages, then generates 3 tone descriptors with supporting evidence quotes. Translators use these to maintain consistent character voice across the translation.

#### Job 3 — Culture Flag Analysis (on-demand per chapter)

Identifies culturally non-portable passages — idioms, cultural references, humor, dialect, and register mismatches — and ranks them by severity:
- `high` — meaning breaks without adaptation
- `medium` — nuance lost, meaning survives
- `low` — stylistic/cosmetic only

Each flag includes multiple translation approach suggestions.

#### Job 4 — Consistency Checks (on-demand per chapter)

Cross-references the translator's draft against confirmed character names and approved glossary terms to catch name drift and terminology inconsistencies.

#### Job 5 — Untranslatable Passage Scan (on-demand per chapter)

Detects form-dependent content (wordplay, puns, rhymes, name meanings, onomatopoeia) where the source text's meaning is inseparable from its form. Suggests strategies: transcribe, adapt, footnote, substitute, or preserve.

---

### Streaming AI Assistant

Every project has a context-aware AI assistant (accessible from the sidebar) that knows the project's title, author, source/target languages, genre, and style guide. Built on a LangGraph state machine with streaming SSE output — responses appear token-by-token in the UI.

```
POST /api/v1/projects/[projectId]/assistant
→ ReadableStream (SSE: `data: token\n\n`)
```

Suggested prompts are context-sensitive: the manuscript page shows manuscript-specific prompts; the culture queue shows flagging-specific prompts; etc.

---

### AI Cost Tracking

Every Anthropic API call — ingestion, profiling, flagging, assistant — inserts a row into `ai_call_log` with: job type, model, input tokens, output tokens, USD cost, and whether the response was served from Anthropic's prompt cache.

```
cost_usd = (input_tokens × $3 + output_tokens × $15) / 1,000,000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password + RLS) |
| AI — LLM | Anthropic Claude Sonnet 3.5 (`@anthropic-ai/sdk`) |
| AI — Orchestration | LangChain LangGraph (`@langchain/langgraph`) |
| Async Jobs | Inngest (serverless job queue) |
| Payments | Stripe |
| File Parsing | Mammoth (DOCX), jszip (EPUB), pdf-parse (PDF) |
| Icons | Tabler Icons |
| Hosting | Vercel |

---

## Features

- **Manuscript upload** — DOCX, EPUB, PDF, TXT; auto-splits into chapters
- **Character registry** — AI-extracted characters with name variants, role classification, tone tags, and confirmed target-language names
- **Glossary manager** — AI-suggested translations for key terms, filterable by status (pending / approved / flagged)
- **Culture queue** — Severity-ranked cultural flags with multiple translation approach suggestions
- **Author Q&A** — Track questions for the original author; export a formatted brief for email
- **Consistency checker** — Scan any chapter draft for name/term drift
- **To-do list** — Auto-generated tasks linked to flags, characters, and glossary terms
- **Research notebook** — Notes, references, and bookmarks organized by category and linked to chapters/characters
- **AI assistant** — Streaming, context-aware chat for any translation question

---

## Database Schema

11 PostgreSQL tables with Row-Level Security (RLS) on every table. All queries are automatically scoped to the authenticated user — no service-role bypasses in user-facing routes.

| Table | Purpose |
|---|---|
| `users` | Auth + subscription tier (free / pro / team) |
| `projects` | Translation project metadata, status, deadline |
| `manuscripts` | Raw uploaded text + parse metadata |
| `chunks` | Chapter-level text segments + draft translations |
| `characters` | Character registry with tone tags and target names |
| `glossary_terms` | Terminology with AI suggestions and approval status |
| `flags` | Culture/consistency/untranslatable flags with suggestions |
| `author_questions` | Q&A thread with original author |
| `project_memory` | Aggregated project context (JSONB, one row per project) |
| `project_todos` | Task list (auto-generated + manual, linked to any entity) |
| `research_notes` | Notes, preface drafts, references, bookmarks |
| `ai_call_log` | Per-call token and cost tracking for every LLM request |

---

## API Routes

29 REST endpoints under `/api/v1/`, all authenticated via Supabase RLS. Every response uses a consistent wrapper:

```json
{ "success": true, "data": {}, "error": null, "timestamp": "..." }
```

<details>
<summary>View all routes</summary>

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/projects` | List projects |
| `POST` | `/projects` | Create project |
| `GET` | `/projects/[id]` | Get project |
| `PUT` | `/projects/[id]` | Update project |
| `POST` | `/projects/[id]/manuscripts/upload` | Upload + parse manuscript, trigger ingestion |
| `GET` | `/projects/[id]/chapters` | List chapters |
| `GET` | `/projects/[id]/chapters/[num]` | Get chapter text |
| `POST` | `/projects/[id]/chapters/[num]/consistency-check` | Enqueue Job 4 |
| `POST` | `/projects/[id]/chapters/[num]/untranslatable-scan` | Enqueue Job 5 |
| `GET` | `/projects/[id]/characters` | List characters |
| `GET/PUT` | `/projects/[id]/characters/[cid]` | Get/update character |
| `POST` | `/projects/[id]/characters/[cid]/refresh-profile` | Re-run Job 2 |
| `GET` | `/projects/[id]/glossary` | List terms (filter by status/type) |
| `GET/PUT` | `/projects/[id]/glossary/[tid]` | Get/update term |
| `POST` | `/projects/[id]/glossary/bulk-approve` | Approve multiple terms |
| `GET` | `/projects/[id]/flags` | List flags (filter by type/status/severity) |
| `GET/PUT` | `/projects/[id]/flags/[fid]` | Get/resolve flag |
| `GET` | `/projects/[id]/culture-queue` | Culture flags sorted by severity |
| `GET/POST` | `/projects/[id]/author-questions` | List/create questions |
| `GET/PUT` | `/projects/[id]/author-questions/[qid]` | Get/update question |
| `POST` | `/projects/[id]/author-questions/export-brief` | Export Q&A as author brief |
| `GET/POST` | `/projects/[id]/todos` | List/create todos |
| `PUT` | `/projects/[id]/todos/[tid]` | Mark done/reopen |
| `GET/POST` | `/projects/[id]/research-notes` | List/create notes |
| `PUT` | `/projects/[id]/research-notes/[nid]` | Update note |
| `POST` | `/projects/[id]/assistant` | Chat (streaming SSE) |
| `POST` | `/projects/[id]/assistant/confirm` | Save assistant suggestion |
| `GET` | `/dashboard` | Summary: projects, flags, glossary, deadlines |

</details>

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- An [Inngest](https://www.inngest.com) account (dev server works locally)
- A [Stripe](https://stripe.com) account (test mode)

### Setup

```bash
git clone https://github.com/TalGhez1214/Haydee-AI.git
cd Haydee-AI
npm install
```

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Run database migrations against your Supabase project:

```bash
# Apply all migrations from supabase/migrations/ in order
# via Supabase dashboard SQL editor or supabase CLI
```

Start the dev server:

```bash
npm run dev          # Next.js on localhost:3000
```

In a separate terminal, start the Inngest dev server to process background jobs:

```bash
npx inngest-cli@latest dev
```

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run lint         # ESLint
npm run db:types     # Regenerate Supabase TypeScript types
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (server-only)
ANTHROPIC_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                      — Login, signup
│   ├── (dashboard)/
│   │   ├── dashboard/               — Home dashboard
│   │   └── projects/[projectId]/
│   │       ├── layout.tsx           — Per-project nav + progress strip
│   │       ├── manuscript/          — Read-only manuscript view
│   │       ├── characters/          — Character registry
│   │       ├── glossary/            — Terminology manager
│   │       ├── culture-queue/       — Cultural flag review
│   │       ├── author-qa/           — Author question tracking
│   │       ├── todo-list/           — Task list
│   │       └── research/            — Notes and references
│   └── api/v1/                      — All API routes
├── components/
│   ├── ui/                          — Button, Badge, Modal, Spinner, Toast
│   ├── layout/                      — Sidebar, Topbar, ProjectNav
│   ├── assistant/                   — Streaming AI chat panel
│   └── projects/                    — Todo list, Research notebook
├── lib/
│   ├── supabase/                    — Browser + server clients
│   ├── ai/
│   │   ├── graphs/                  — LangGraph state machines
│   │   ├── prompts/                 — Prompt templates
│   │   └── utils/                   — Auto-task generation
│   └── inngest/                     — Job definitions
└── types/                           — database.ts, api.ts, ai.ts
supabase/
└── migrations/                      — 20 SQL migration files
```

---

## License

MIT — see [LICENSE](LICENSE)
