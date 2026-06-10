# Haydee — AI Co-Pilot for Literary Translators

> An intelligent workspace for professional book translators. Haydee handles the groundwork — character tracking, terminology management, cultural analysis, and consistency checking — so translators can focus on craft.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)
![Anthropic Claude](https://img.shields.io/badge/Claude-Sonnet-D97757?style=flat-square&logo=anthropic&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.3-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Inngest](https://img.shields.io/badge/Inngest-async%20jobs-5D5FEF?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Why Haydee?

Literary translation is not a search-and-replace problem. A professional translator working on a 150,000-word novel juggles hundreds of named characters with variants across languages, thousands of culture-specific terms, dialect patterns, wordplay that resists translation, and a narrator's voice that must stay consistent from page 1 to page 400.

Today that work happens across a patchwork of spreadsheets, word processors, and sticky notes.

**Haydee solves three real problems:**

**1. The knowledge problem.** A translator mid-project can't hold the entire book in their head. Did the author use "bürgerlich" as a neutral descriptor or a loaded term? When did Elena shift from formal to familiar register with the protagonist? Haydee extracts this knowledge automatically on upload and keeps it queryable.

**2. The context problem.** AI translation tools that operate on a single highlighted passage produce generic output — they don't know who is speaking, what happened in the previous chapter, or what register the author uses in emotionally charged scenes. Haydee feeds the full narrative context (adjacent chapter summaries, character tone profiles, approved glossary) into every translation suggestion.

**3. The consistency problem.** Across a 200,000-word translation, names drift, approved terms get forgotten, and character voice shifts invisibly. Haydee's consistency checker catches these mechanically before they reach the editor.

**The AI suggests. The translator decides.**

---

## How It Works

### Upload → Knowledge Base (automatic)

When a translator uploads a manuscript, the following pipeline runs automatically — zero manual steps required.

```
Upload file (DOCX / EPUB / PDF / TXT)
  │
  ▼
Parse + split into chapter chunks
  │
  ├─ Job 1: Manuscript Ingestion (Claude Sonnet, per chapter)
  │    Extracts characters, glossary candidates, culture flags,
  │    untranslatable passages, and a chapter summary from each chapter.
  │    Results are deduplicated and merged across the full book.
  │    Saved to: characters, glossary_terms, flags, chunks.summary
  │
  ├─ Job 2: Character Voice Profiling (Claude Sonnet, per character)
  │    Triggered by Job 1 for each extracted character.
  │    Scans all chapters for that character's passages.
  │    Produces 3 tone descriptors with supporting evidence quotes.
  │    Saved to: characters.tone_tags
  │
  └─ Job 7: Embedding Generation (Voyage AI, all chapters)
       Triggered by Job 1 after all chapters are processed.
       Sends each chapter summary to Voyage AI (voyage-3-lite, 512 dims).
       Stores vectors in PostgreSQL via pgvector.
       Saved to: chunks.embedding
```

At this point the book is fully indexed: every chapter has a summary and a semantic embedding, every character has tone tags, and every glossary candidate is awaiting translator approval.

---

### RAG-Powered Assistant

The assistant panel (available on every project page) is backed by a full Retrieval-Augmented Generation pipeline. Every question triggers:

```
User question
  │
  ▼
Embed question (Voyage AI)
  │
  ▼
pgvector cosine similarity search → top-4 most relevant chapter summaries
  │
  ▼
Assemble context:
  ├─ Relevant chapter summaries (semantic search)
  ├─ All characters (name, role, tone tags, confirmed target name)
  └─ Approved glossary terms (source → target, type)
  │
  ▼
Claude Sonnet — streaming response (SSE)
```

When the translator is on the manuscript view, the current chapter and its neighbours are pinned into the context regardless of semantic score — the assistant always knows what the translator is looking at.

---

### Context-Aware Translation Suggestions

When a translator selects a passage and requests a translation suggestion:

```
Selected passage + chunk ID
  │
  ▼
Job 6: Translation Graph (Inngest background job)
  ├─ Load project metadata
  ├─ Load approved glossary
  ├─ Load character profiles
  ├─ Load chapter context (chunk N-1, N, N+1 summaries via chunk ID)
  └─ Claude Sonnet — structured translation prompt
       Includes: narrative context, character register, approved terms
```

Translation suggestions are not stateless one-shot calls. They know the characters in the scene, what happened in the chapter before, and what happens next.

---

### On-Demand Analysis Jobs

| Job | Trigger | What it does |
|---|---|---|
| Job 3 — Culture Flags | Per chapter, on demand | Finds culturally non-portable passages (idioms, humor, dialect, register mismatches); ranks by severity |
| Job 4 — Consistency Check | Per chapter, on demand | Cross-references translator draft against confirmed character names and approved glossary terms |
| Job 5 — Untranslatable Scan | Per chapter, on demand | Detects form-dependent content (wordplay, puns, rhymes, name meanings) and suggests strategies |

---

## AI & LLM Architecture

All AI work is **fully asynchronous** — no HTTP request ever waits for an LLM. Every job runs through [Inngest](https://www.inngest.com/) as a background job, orchestrated by [LangChain LangGraph](https://langchain-ai.github.io/langgraphjs/) state machines.

| Component | Provider | Purpose |
|---|---|---|
| LLM | Anthropic Claude Sonnet (`@anthropic-ai/sdk`) | All text generation: ingestion, profiling, flagging, translation, assistant |
| Embeddings | Voyage AI `voyage-3-lite` (REST) | 512-dim semantic vectors for RAG retrieval |
| Vector DB | PostgreSQL + pgvector (Supabase) | Cosine similarity search via HNSW index |
| Orchestration | LangGraph StateGraph | Multi-step job pipelines with structured output |
| Job Queue | Inngest | Async dispatch, retries, observability |

Every Anthropic call logs to `ai_call_log` with: model, job type, input tokens, output tokens, USD cost, and cache status.

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
| AI — LLM | Anthropic Claude Sonnet |
| AI — Embeddings | Voyage AI `voyage-3-lite` |
| AI — Orchestration | LangChain LangGraph |
| Vector Search | pgvector (HNSW cosine similarity) |
| Async Jobs | Inngest |
| Payments | Stripe |
| File Parsing | Mammoth (DOCX), jszip (EPUB), pdf-parse (PDF) |
| Icons | Tabler Icons |
| Hosting | Vercel |

---

## Features

- **Manuscript upload** — DOCX, EPUB, PDF, TXT; auto-splits into chapters
- **RAG knowledge base** — every chapter embedded and indexed on upload; queryable by semantic similarity
- **Character registry** — AI-extracted characters with name variants, role, tone tags, and confirmed target-language names
- **Glossary manager** — AI-suggested translations filterable by status (pending / approved / flagged)
- **Culture queue** — Severity-ranked cultural flags with multiple translation approach suggestions
- **Context-aware translation** — suggestions that include surrounding chapter summaries and character profiles
- **Author Q&A** — Track questions for the original author; export a formatted brief
- **Consistency checker** — Scan any chapter draft for name and term drift
- **To-do list** — Auto-generated tasks linked to flags, characters, and glossary terms
- **Research notebook** — Notes, references, and bookmarks linked to chapters and characters
- **AI assistant** — Streaming, RAG-backed chat that knows the entire book

---

## Database Schema

13 PostgreSQL tables with Row-Level Security on every table. All queries are user-scoped — no service-role bypasses in user-facing routes.

| Table | Purpose |
|---|---|
| `users` | Auth + subscription tier |
| `projects` | Project metadata, status, deadline |
| `manuscripts` | Raw text + parse metadata |
| `chunks` | Chapter segments, summaries, pgvector embeddings |
| `characters` | Registry with tone tags and confirmed target names |
| `glossary_terms` | Terminology with AI suggestions and approval status |
| `flags` | Culture / consistency / untranslatable flags |
| `author_questions` | Q&A thread with the original author |
| `project_memory` | Aggregated project context (one row per project) |
| `project_todos` | Task list, auto-generated and manual |
| `research_notes` | Notes, preface drafts, references, bookmarks |
| `translation_requests` | Translation job history linked to source chunks |
| `ai_call_log` | Per-call token and cost tracking |
| `stripe_events` | Webhook event log |

---

## API Routes

All 29+ endpoints live under `/api/v1/`, authenticated via Supabase RLS. Consistent response envelope:

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
| `GET` | `/projects/[id]/glossary` | List terms |
| `GET/PUT` | `/projects/[id]/glossary/[tid]` | Get/update term |
| `POST` | `/projects/[id]/glossary/bulk-approve` | Approve multiple terms |
| `GET` | `/projects/[id]/flags` | List flags |
| `GET/PUT` | `/projects/[id]/flags/[fid]` | Get/resolve flag |
| `GET` | `/projects/[id]/culture-queue` | Culture flags sorted by severity |
| `GET/POST` | `/projects/[id]/author-questions` | List/create questions |
| `GET/PUT` | `/projects/[id]/author-questions/[qid]` | Get/update question |
| `POST` | `/projects/[id]/author-questions/export-brief` | Export Q&A as author brief |
| `GET/POST` | `/projects/[id]/todos` | List/create todos |
| `PUT` | `/projects/[id]/todos/[tid]` | Mark done/reopen |
| `GET/POST` | `/projects/[id]/research-notes` | List/create notes |
| `PUT` | `/projects/[id]/research-notes/[nid]` | Update note |
| `POST` | `/projects/[id]/assistant` | Chat (streaming SSE, RAG-backed) |
| `POST` | `/projects/[id]/translate` | Request translation suggestion |
| `GET` | `/dashboard` | Summary: projects, flags, glossary, deadlines |

</details>

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with pgvector enabled
- An [Anthropic](https://console.anthropic.com) API key
- A [Voyage AI](https://dash.voyageai.com) API key (free tier: 200M tokens/month)
- An [Inngest](https://www.inngest.com) account (dev server works fully offline)

### Setup

```bash
git clone https://github.com/TalGhez1214/Haydee-AI.git
cd Haydee-AI
npm install
cp .env.example .env.local
# fill in credentials
```

Apply all migrations to your Supabase project (SQL editor or Supabase CLI), in order, from `supabase/migrations/`.

Start the app and Inngest dev server in two terminals:

```bash
# Terminal 1
npm run dev

# Terminal 2 — routes background jobs to your local Next.js app
npx inngest-cli@latest dev -u http://localhost:3000/api/webhooks/inngest
```

### Scripts

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run db:types     # Regenerate Supabase TypeScript types
```

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=
VOYAGE_API_KEY=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

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
│   └── assistant/                   — Streaming RAG chat panel
├── lib/
│   ├── supabase/                    — Browser + server clients
│   ├── ai/
│   │   ├── graphs/                  — LangGraph state machines (Jobs 1–7)
│   │   ├── prompts/                 — Prompt builders
│   │   ├── rag/                     — Embeddings, retrieval, context builder
│   │   └── utils/                   — Auto-task generation
│   └── inngest/                     — Job definitions
└── types/                           — database.ts, api.ts, ai.ts
supabase/
└── migrations/                      — 22 SQL migration files
```

---

## License

MIT — see [LICENSE](LICENSE)
