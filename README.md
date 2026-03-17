<p align="center">
  <img src="https://api.dicebear.com/9.x/thumbs/svg?seed=Poco&backgroundColor=0a0a0a&shapeColor=f43f5e" width="80" height="80" alt="HeyPoco" />
</p>

<h1 align="center">HeyPoco</h1>
<p align="center"><strong>Speak your life once, access it anytime.</strong></p>

<p align="center">
  A voice-first personal life logger powered by a full RAG pipeline —<br/>
  transcription, structured extraction, vector embeddings, and natural language retrieval.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o%20%7C%20Whisper-412991?logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase&logoColor=white" />
</p>

---

## The Problem

People generate hundreds of micro-events daily — expenses, tasks, meetings, health notes, journal thoughts — but capturing them requires switching between 5+ apps. Most of it is never logged. And when you need to recall something from last week? Good luck searching across scattered tools.

## The Solution

HeyPoco lets you **speak or type anything** — and the system figures out the rest.

Say *"Spent $45 at Whole Foods on groceries"* and it automatically classifies it as finance, extracts the amount, merchant, and category. Say *"Flying from Phoenix to New York tomorrow at 3pm"* and it creates a structured travel event. Later, ask *"How much did I spend last week?"* and get an instant, accurate answer synthesized from your own data.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  Next.js 16 · React 19 · Tailwind · Framer Motion           │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │  Voice   │  │  Rich    │  │  Query    │  │  Auth      │  │
│  │  Capture │  │  Cards   │  │  Chat UI  │  │  (Supabase)│  │
│  └────┬─────┘  └──────────┘  └─────┬─────┘  └────────────┘  │
└───────┼────────────────────────────┼─────────────────────────┘
        │ audio/text                 │ natural language
        ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                          │
│                                                              │
│  ┌──────────────── INGEST PIPELINE ────────────────────┐    │
│  │                                                      │    │
│  │  Whisper ──▶ PII Scrub ──▶ GPT-4o ──▶ Embed ──▶ DB │    │
│  │  (STT)      (local)       (extract)   (1536d)       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────── QUERY PIPELINE ─────────────────────┐    │
│  │                                                      │    │
│  │  Classify ──▶ Route ──▶ Retrieve ──▶ Synthesize     │    │
│  │  (< 1ms)     (4 paths)  (SQL+vector)  (GPT-4o)     │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + pgvector)                 │
│                                                              │
│  entries: raw_text | type | extracted_fields (JSONB)         │
│           embedding (VECTOR 1536) | tags[] | entry_date      │
│                                                              │
│  RLS: every query scoped to authenticated user               │
│  RPC: match_entries() — cosine similarity with filters       │
└─────────────────────────────────────────────────────────────┘
```

---

### Ingestion Pipeline

When a user speaks or types an entry, it flows through 5 decoupled stages:

```
POST /api/ingest
│
├─ 1. TRANSCRIBE ─────── Whisper (whisper-1) converts audio → text
│                         Supports mp3, mp4, wav, m4a, webm
│
├─ 2. PII DETECTION ──── Local regex engine (zero API calls)
│                         Detects SSN, credit cards, Aadhaar, PAN, IFSC, phone, email
│                         Sensitive entries flagged → never embedded, never searchable
│
├─ 3. EXTRACT ─────────── GPT-4o with JSON mode (temperature=0.1)
│                         Classifies entry type + extracts structured fields
│                         Resolves relative dates with timezone awareness
│
├─ 4. EMBED ──────────── text-embedding-3-small → 1536-dim vector
│                         Skipped for PII-flagged entries
│
└─ 5. STORE ──────────── Supabase INSERT — JSONB fields + vector embedding
```

Each step is a **standalone service** — independently testable, swappable, and failure-isolated. If extraction fails, the entry still saves as `general` type. If PII is detected, embedding is skipped but the entry is preserved.

---

### Query Pipeline — Hybrid 4-Path Retrieval

When a user asks a question, the system **classifies intent in < 1ms** using a zero-API keyword router and picks the optimal retrieval strategy:

```
POST /api/query { question: "How much did I spend last week?" }
│
├─ 1. CLASSIFY (< 1ms, zero API calls) ────────────────────────
│     Keyword + regex analysis determines:
│     • is_finance? → detected "spend", extracts time window
│     • is_person?  → extracts person name
│     • is_list?    → "show me", "list", "what are"
│     • time_window → resolves "last week" to UTC date range
│
├─ 2. ROUTE to optimal retrieval path ──────────────────────────
│
│     PATH A: FINANCE SQL
│     │  Direct aggregation — all entries with amount in time window
│     │  Totals pre-computed in Python (never hallucinated by LLM)
│     │
│     PATH B: VECTOR SEARCH (pgvector)
│     │  Embed question → cosine similarity via match_entries() RPC
│     │  Threshold: 0.6 similarity, top-k results
│     │
│     PATH C: PERSON SQL
│     │  Entries where extracted_fields → person matches the query
│     │
│     PATH D: TYPE + DATE SQL
│        List queries — returns entries directly, no synthesis needed
│
├─ 3. MERGE + DEDUPLICATE ──────────────────────────────────────
│     Results from multiple paths merged by entry ID
│     Ranked by relevance (similarity score or recency)
│
└─ 4. SYNTHESIZE (GPT-4o) ─────────────────────────────────────
      Natural language answer from retrieved context
      Finance totals passed as pre-computed facts (not generated)
      Confidence scoring: high | medium | low
      Skipped entirely for list queries (PATH D)
```

**Why 4 paths instead of pure vector search?**

Vector search fails on structured queries. *"How much did I spend last week?"* needs SQL aggregation, not semantic similarity. *"What did I discuss with Sarah?"* needs an exact person filter. The classifier routes each query to the right tool — vector for fuzzy/semantic, SQL for precise/structured — and merges when multiple paths apply.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16, React 19, TypeScript | App Router, SSR, middleware-level auth |
| **Styling** | Tailwind CSS, Framer Motion | Rapid UI iteration + smooth animations |
| **State** | Zustand + React Query | Clean split: client state + server cache |
| **Backend** | FastAPI, Python 3.11, Pydantic v2 | Async-first, type-safe, auto-docs |
| **Auth** | Supabase Auth + `@supabase/ssr` | JWT, SSR-safe cookies, database-level RLS |
| **Database** | PostgreSQL (Supabase) + pgvector | Relational + vector search in one engine |
| **AI/ML** | OpenAI Whisper, GPT-4o, Embeddings | STT, structured extraction, semantic search |
| **Deployment** | Vercel (frontend) + Railway (backend) | Zero-config, auto-deploy from `main` |

---

## Database Design

```sql
profiles
├── id          UUID (PK, FK → auth.users)
├── email       TEXT
├── timezone    TEXT (default 'UTC')
└── created_at  TIMESTAMPTZ

entries
├── id                UUID (PK)
├── user_id           UUID (FK → profiles, RLS-enforced)
├── source            TEXT ('voice' | 'text')
├── raw_text          TEXT (immutable — original input always preserved)
├── type              TEXT (finance | task | event | journal | health | note | general)
├── extracted_fields  JSONB (domain-specific structured data)
├── tags              TEXT[]
├── entry_date        TIMESTAMPTZ (when it happened, not when logged)
├── is_sensitive      BOOLEAN
├── pii_types         TEXT[]
├── embedding         VECTOR(1536) (NULL for sensitive entries)
└── created_at        TIMESTAMPTZ

-- Vector similarity search via RPC
match_entries(query_embedding, user_id, threshold, ...)
  → Cosine distance ranking with type/date/sensitivity filters
```

**Key design decisions:**
- **JSONB for extracted fields** — zero migrations to add new entry types. Finance stores `{amount, merchant, category}`, events store `{title, scheduled_at, location, people}`, health stores `{symptom, medication, severity}`.
- **Immutable `raw_text`** — original input never modified. Structured data lives in `extracted_fields`.
- **NULL embeddings for PII** — sensitive entries stored but excluded from all vector search results.
- **Row-Level Security** — every query scoped to `auth.uid()`, enforced at the database level.
- **Free-text type column** — no ENUM constraint. New domain types added by updating the extraction prompt only, no migration needed.

---

## Entry Types

| Type | Extracted Fields | Example Input |
|------|-----------------|---------------|
| **finance** | `amount`, `currency`, `merchant`, `category`, `breakdown` | *"Spent $45 at Whole Foods on groceries"* |
| **task** | `action`, `deadline`, `status` | *"Need to finish the presentation by Friday"* |
| **event** | `title`, `scheduled_at`, `location`, `duration_minutes`, `people` | *"Meeting with Sarah at 3pm tomorrow"* |
| **journal** | `mood`, `energy`, `highlights` | *"Feeling great today, had a productive morning"* |
| **health** | `symptom`, `medication`, `severity` | *"Took ibuprofen for headache, feeling better"* |
| **note** | `topic`, `person` | *"Interesting idea about the new product feature"* |

---

## Security Model

| Layer | Implementation |
|-------|---------------|
| **PII Detection** | Local regex engine runs *before* any external API call. Detects SSN, credit cards, Aadhaar, PAN, IFSC, phone, email. Sensitive entries are never sent to embedding API and never returned in search. |
| **Row-Level Security** | Every database query scoped to `auth.uid()`. Users cannot access another user's data — enforced at PostgreSQL level, not application level. |
| **Auth (Server)** | Next.js middleware validates JWT via Supabase `getUser()` (server-side token verification, not local cookie trust). |
| **Auth (Client)** | Secondary client-side guard catches edge cases where JS bundle executes despite middleware redirect. |
| **Immutable Input** | `raw_text` is never modified post-storage. All transformations stored separately in `extracted_fields`. |

---

## Project Structure

```
HeyPoco/
├── frontend/                          Next.js 16 application
│   ├── src/
│   │   ├── app/                       Pages & route layouts
│   │   │   ├── (auth)/                Login / Signup (public)
│   │   │   ├── (dashboard)/           Protected dashboard views
│   │   │   ├── chat/                  Main chat interface
│   │   │   └── experiments/           UI experiments & component showcase
│   │   ├── components/                React components
│   │   │   ├── voice-capture.tsx      Web Audio API mic recording
│   │   │   ├── confirmation-card.tsx  Pre-save review card
│   │   │   ├── entry-feed.tsx         Entry timeline
│   │   │   ├── query-bar.tsx          NL query input
│   │   │   └── rich-previews.tsx      Rich card rendering (8 card types)
│   │   ├── stores/                    Zustand stores
│   │   ├── hooks/                     Custom hooks (voice, entries, query)
│   │   ├── lib/                       API client, Supabase config
│   │   ├── types/                     TypeScript interfaces
│   │   └── middleware.ts              Auth route protection
│   └── package.json
│
├── backend/                           FastAPI application
│   ├── app/
│   │   ├── main.py                    App entry, CORS, lifespan
│   │   ├── config.py                  Pydantic settings (env validation)
│   │   ├── routers/                   API endpoints
│   │   │   ├── ingest.py              5-step pipeline orchestrator
│   │   │   ├── query.py               Query pipeline orchestrator
│   │   │   ├── entries.py             CRUD operations
│   │   │   └── auth.py                JWT verification
│   │   ├── services/                  Decoupled business logic
│   │   │   ├── transcription_service  Whisper STT
│   │   │   ├── pii_service            Local regex PII detection
│   │   │   ├── extraction_service     GPT-4o structured extraction
│   │   │   ├── embedding_service      text-embedding-3-small (1536d)
│   │   │   ├── query_classifier       Sub-ms intent classification
│   │   │   ├── retrieval_service      4-path hybrid retrieval
│   │   │   ├── synthesis_service      GPT-4o answer generation
│   │   │   └── query_service          Full pipeline orchestrator
│   │   └── schemas/                   Pydantic request/response models
│   └── requirements.txt
│
├── supabase/
│   └── migrations/                    Sequential SQL migrations
│       ├── 001_create_profiles.sql
│       ├── 002_create_entries.sql     (pgvector extension + VECTOR column)
│       ├── 003_enable_rls.sql         (row-level security policies)
│       ├── 004_create_indexes.sql
│       ├── 005_create_match_entries.sql (vector search RPC function)
│       └── 006_create_waitlist.sql
│
├── railway.json                       Backend deployment config
└── package.json                       pnpm monorepo workspace
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ingest` | Full pipeline: transcribe → PII → extract → embed → store |
| `POST` | `/api/query` | Natural language query with RAG retrieval + synthesis |
| `POST` | `/api/transcribe` | Whisper transcription only |
| `POST` | `/api/extract` | GPT-4o extraction only |
| `GET` | `/api/entries` | List entries (filter by type, date range) |
| `POST` | `/api/entries` | Create entry directly |
| `PATCH` | `/api/entries/:id` | Update entry |
| `DELETE` | `/api/entries/:id` | Delete entry |
| `GET` | `/api/health` | Health check |

---

## Getting Started

### Prerequisites

- Node.js 18+, pnpm
- Python 3.11+
- [Supabase](https://supabase.com) project (free tier works)
- [OpenAI](https://platform.openai.com) API key

### Setup

```bash
git clone https://github.com/anirudh3699/HeyPoco.git
cd HeyPoco

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Fill in Supabase + OpenAI credentials
cd ..

# Frontend
cd frontend && pnpm install
cp .env.example .env.local    # Fill in Supabase URL + anon key + API URL
cd ..

# Database — run migrations in your Supabase SQL editor
# Or: pnpm db:migrate

# Start both services
pnpm dev
# Frontend → http://localhost:3333
# Backend  → http://localhost:8888/docs
```

---

## Deployment

| Service | Platform | Details |
|---------|----------|---------|
| **Frontend** | Vercel | Auto-deploy from `main`, zero-config Next.js |
| **Backend** | Railway | Nixpacks build, `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Database** | Supabase | Managed PostgreSQL + pgvector + Auth + RLS |

---

## License

Private — All rights reserved.

---

<p align="center">
  Built by <a href="https://github.com/anirudh3699">Kshitij</a>
</p>
