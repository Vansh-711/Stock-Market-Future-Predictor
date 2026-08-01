# Signal Chain — V2 Master Plan & Handoff

**Read this entire file before writing code.** It captures what V1 is, what V2 must become, every design constraint, the phased execution order, and enough context for a new AI session to continue without re-discovering the project.

**Last updated:** 2026-07-27  
**Repository:** `Stock-Market-Future-Predictor` (user: Vansh-711)  
**Local path:** `/Users/apple/Desktop/grp_5`

---

## 0. One-sentence product goal (unchanged from V1)

**Signal Chain** is an event-driven causal analysis platform: classify real news events, walk a company relationship graph, show **historical backtest hit rates** and a **simple logistic regression confidence** — and generate plain-English **hypotheses**, not “AI predicts stock prices.”

---

## 1. What V1 is today (baseline — do not break this mentally)

### 1.1 Repo layout (as of V1 completion)

| Path | Role |
|------|------|
| `backend/` | Django + DRF + SQLite, all domain logic |
| `frontend/` | React 18 + Vite + Tailwind (was `workspace-019f9a7c-...` during early dev) |
| `backend/data/polygon_news_sample.json` | User’s Polygon-style news file (**gitignored** — not on GitHub) |
| `.gitignore` | Ignores `venv/`, `db.sqlite3`, `node_modules/`, API keys, large JSON datasets, price cache, `model.joblib` |

### 1.2 V1 phases (all done via **terminal management commands**)

| Phase | Command | Output |
|-------|---------|--------|
| **A** Seed graph | `python manage.py seed_graph` | `Company`, `Relationship` from `market/seed_data/companies.json` |
| **B** Ingest + classify | `python manage.py ingest_news_json --file ... --provider gemini` | `NewsEvent` rows |
| **C** Backtest | `python manage.py run_backtest` | `BacktestPattern` (hit rates via **yfinance**) |
| **D** Train model | `python manage.py train_model` | `market/data/_model/model.joblib` + `metrics.json` |
| **E** Generate chains | `python manage.py generate_chains --provider gemini --prefer-patterns` | `GeneratedChain` rows + Gemini explanations |
| **F** API verify | `curl` / browser | `/api/v1/market/*`, `/api/v1/auth/*` |
| **G** Smoke test | manual | empty lists, 401 on `/auth/me` |

### 1.3 V1 graph size (current seed file)

- **37 companies**, **48 relationships** in `backend/market/seed_data/companies.json`
- **V2 target:** **≥50 companies**, **significantly more edges** (see Phase A2)

### 1.4 V1 ingest behavior (critical — preserve in V2)

File: `backend/market/management/commands/ingest_news_json.py`

- Polygon-style JSON: `title`, `description`, `published_utc`, `tickers[]`, `insights[]`, `publisher`
- **Only first ticker** in `tickers` is the event subject (avoids double-counting ripple tickers)
- Sentiment from dataset `insights[].sentiment` → mapped to score
- Event type from LLM using `sentiment_reasoning` + title + description
- **`--prefer-events`**: skips Motley-Fool-style “should you buy?” articles
- Gemini model default: **`gemini-3.1-flash-lite`** (NOT `gemini-2.5-flash` — 404 for new users)
- Rate limiting: delay between calls + retry on 429
- Keyword fallback if LLM fails

### 1.5 V1 auth / CORS / CSRF (already fixed for SPA)

- Frontend API base: `frontend/src/shared/config/env.ts` → `http://localhost:8000/api/v1`
- All fetches: `credentials: "include"`
- `backend/config/settings.py`: `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` for `localhost:5173`
- `accounts/views.py`: signup/login/logout use `@csrf_exempt` for cross-origin SPA (dev only pattern)

### 1.6 V1 API surface (existing — V2 extends, does not replace blindly)

```
GET  /api/v1/market/companies/?search=
GET  /api/v1/market/relationships/
GET  /api/v1/market/events/?symbol=
GET  /api/v1/market/patterns/
GET  /api/v1/market/chains/?symbol=
GET  /api/v1/market/graph/
POST /api/v1/auth/signup|login|logout/
GET  /api/v1/auth/me/
```

### 1.7 V1 frontend routes (read-only consumption of pipeline output)

- `/login`, `/signup`, `/`, `/patterns`, `/explorer`, `/chains`, `/chains/:id`, `/companies/:symbol`
- **No pipeline UI** — user cannot run phases from the browser in V1

### 1.8 Known data realities (teach the professor honestly)

- Polygon/Motley Fool feed is **mostly opinion** → many `other` labels are **correct**
- Backtest needs **non-other** events + graph edges → use `--prefer-events` or equivalent in V2
- Model accuracy ~**55%** on small sample is **acceptable** if you show confusion matrix / coefficients
- Price data comes from **yfinance at backtest/train time**, not from the news JSON file

---

## 2. V2 vision (what “big” means)

**Every V1 terminal phase becomes a guided, visual workflow in the browser**, with:

1. **Flexible ingestion** — user uploads an arbitrary news file (JSON array, JSONL, or CSV with auto-detected columns); system detects format, maps fields, previews matches to the company universe, then runs classification.
2. **API key in the UI** — user enters **Gemini API key** in Settings (not `export GEMINI_API_KEY` in terminal). Key stored **per user** or **per workspace** on server (encrypted at rest — see security section).
3. **Full pipeline orchestration** — one “Run pipeline” or step-by-step wizard: Seed → Ingest → Backtest → Train → Generate chains, each with **live progress** (percent, step label, log tail, cancel where safe).
4. **Nothing invisible** — each phase has a **dedicated screen/panel** with charts, tables, or graph updates when that phase completes.
5. **Expanded knowledge graph** — **50+ companies**, richer relationship web (suppliers, customers, competitors, peers across sectors).
6. **Handoff-safe** — this document is the single source of truth for the next AI.

**Explicit non-goals for V2 (unless user changes mind):**

- No decorative “solar system” stock visualizer
- No claims of “predicting prices” in marketing copy
- No requirement for a persistent Node.js server (offline ingestion scripts remain optional; V2 is Django-orchestrated)
- No black-box ML — keep logistic regression + explainable metrics

---

## 3. Recommended V2 architecture

### 3.1 High-level flow

```
Browser (Pipeline UI)
    ↕ REST (+ optional SSE/WebSocket for progress)
Django API
    ├── PipelineJob / PipelineStep models (status, progress, logs)
    ├── Ingestion adapters (polygon_json, csv_generic, jsonl_generic)
    ├── Refactored services (extract logic FROM management commands)
    ├── Celery OR threaded async jobs (see 3.3)
    └── Gemini client (key from UserSettings, not env)
SQLite (dev) — same as V1 unless user opts into Postgres later
yfinance (price fetch) — unchanged conceptually
```

### 3.2 Refactor rule (important for implementers)

**Do not duplicate business logic in views.** Extract shared functions used by both:

- existing `management/commands/*.py` (keep for power users / debugging), and
- new `market/services/*.py` called by API + job runner.

Commands become thin wrappers around services.

### 3.3 Long-running work & progress (pick one for V2 MVP)

| Option | Pros | Cons |
|--------|------|------|
| **A. Django + background thread + in-memory/DB job state** | No Redis/Celery setup | Fragile on server restart; single worker |
| **B. Celery + Redis** | Production-grade | Extra infra for college demo |
| **C. Synchronous chunk API** | Simplest | Browser must poll many small steps |

**Recommended for V2:** **A for MVP** (SQLite job rows + thread pool), with **Server-Sent Events (SSE)** or **polling** `GET /api/v1/pipeline/jobs/{id}/` every 1–2s. Upgrade to Celery in V2.1 if needed.

Progress payload shape (standardize early):

```json
{
  "job_id": "uuid",
  "phase": "ingest",
  "status": "running",
  "progress_percent": 42,
  "current_step": "Classifying article 84/200",
  "items_total": 200,
  "items_done": 84,
  "logs": ["...", "..."],
  "error": null
}
```

### 3.4 Gemini API key storage

**New model (example):** `UserSettings` or `WorkspaceSettings`

- `user` (FK, optional if single-tenant demo)
- `gemini_api_key_encrypted` (Fernet or django-encrypted-field)
- `gemini_model` (default `gemini-3.1-flash-lite`)
- `ingest_delay_seconds` (default 2.0)
- `prefer_events` (bool, default true)

**API:**

- `GET/PUT /api/v1/settings/llm/` — never return full key; return `key_set: true`, last 4 chars optional
- Pipeline steps read key from DB for that user

**Security notes for presentation:**

- Keys must never appear in logs or job `logs[]` array
- `.env` still allowed for server-side dev fallback only
- Document that production needs HTTPS + secret key rotation

### 3.5 Flexible news file ingestion (adapters)

Implement a **registry** of adapters:

| Adapter ID | Detect | Map to internal article shape |
|------------|--------|-------------------------------|
| `polygon_json` | `tickers` + `insights` + `published_utc` | Current ingest logic |
| `json_generic` | array of objects with `title`/`headline` + `symbol`/`ticker` | User maps columns in UI preview |
| `csv_generic` | flat file | Reuse `ingest_news.py` column detection |
| `jsonl` | one JSON per line | Same as polygon or generic |

**Upload flow:**

1. `POST /api/v1/pipeline/upload/` → store file under `media/pipeline_uploads/{job_id}/` (gitignored)
2. `POST /api/v1/pipeline/detect/` → returns `{ adapter, preview_rows, matched_companies_count, warnings }`
3. Optional UI step: user confirms column mapping for generic formats
4. `POST /api/v1/pipeline/run/` with `{ phases: ["ingest", "backtest", ...], options: {...} }`

---

## 4. V2 phased execution plan (build order)

Implement in this order. Each phase has **backend**, **frontend**, and **acceptance criteria**.

---

### Phase V2-A — Expanded seed graph (50+ companies, more edges)

**Status: implemented (2026-07-27).** The seed graph now contains 54 companies,
96 directed relationships, and all eight existing sectors; every newly added
company has at least two graph connections. `GET /api/v1/market/graph/stats/`
returns graph health. Explorer now supports sector and relationship filtering
with a visible relationship-count legend, and `/pipeline` shows graph-health
metrics.

**Backend**

- Extend `backend/market/seed_data/companies.json` to **≥50 companies** (8 sectors, mix of mega-caps and suppliers)
- Target **≥80–120 relationships** (not just competitor pairs — add customer/supplier chains, e.g. retail → logistics, auto → battery)
- Update `seed_graph` to remain idempotent
- Add `GET /api/v1/market/graph/stats/` → `{ company_count, edge_count, by_sector, by_relationship_type }`

**Frontend**

- **Explorer** enhancements: sector filter, relationship type legend, counts in sidebar
- **New: “Graph health” card** on pipeline dashboard — shows 50 companies / N edges before run

**Acceptance**

- `seed_graph` loads without errors
- Graph API returns ≥50 nodes
- Explorer renders without performance collapse (force-graph may need limit/pause for weak devices)

---

### Phase V2-B — Settings & Gemini key in browser

**Status: implemented (2026-07-27).** `accounts.UserSettings` stores the key as
Fernet ciphertext; set `FIELD_ENCRYPTION_KEY` in production. The development
fallback derives a stable key from Django's `SECRET_KEY`. APIs are available at
`/api/v1/settings/llm/` and `/api/v1/settings/llm/test/`; the protected browser
screen is `/settings`.

**Backend**

- `UserSettings` model + migration
- Encrypted key field + `PUT` endpoint
- Refactor `classify_event_type_gemini` and `generate_chains` Gemini calls to accept `api_key` argument from settings service

**Frontend**

- **Settings page** `/settings` (protected): API key input (password field), model dropdown, delay slider, “prefer events” toggle
- Test connection button: `POST /api/v1/settings/llm/test/` → one minimal Gemini call, success/fail message

**Acceptance**

- User can run ingest from UI with **no terminal `export GEMINI_API_KEY`**
- Key not visible in network responses after save

---

### Phase V2-C — Pipeline job system + progress UI shell

**Status: implemented as the V2 control-plane foundation (2026-07-27).**
`PipelineJob` and `PipelineLog` persist job state and activity. The browser
polls `POST /api/v1/pipeline/jobs/`, `GET /api/v1/pipeline/jobs/{id}/`, and
the log endpoint; cancellation is supported at `POST .../cancel/`. The
threaded MVP runner currently performs the honest available step—graph
synchronization. V2-D through V2-G will attach their services to this same
runner rather than faking progress.

**Backend**

- Models: `PipelineJob`, `PipelineStep` (or JSON field on job for step list)
- Endpoints:
  - `POST /api/v1/pipeline/jobs/` — create job
  - `GET /api/v1/pipeline/jobs/{id}/`
  - `GET /api/v1/pipeline/jobs/{id}/events/` — SSE stream OR poll-friendly log endpoint
  - `POST /api/v1/pipeline/jobs/{id}/cancel/` — best-effort cancel
- Job runner invokes services sequentially: ingest → backtest → train → chains

**Frontend**

- **New route:** `/pipeline` — master wizard layout
- Global **progress bar** + stepper: A Seed → B Ingest → C Backtest → D Train → E Chains → F Verify
- Activity log panel (scrollable, monospace)
- Empty state: “Upload a news file to begin”

**Acceptance**

- Creating a job returns `job_id`; UI polls until `status: completed|failed`
- Progress percent moves during ingest (not stuck at 0%)

---

### Phase V2-D — Upload & detect (flexible file) + Ingest UI (Phase B in browser)

**Backend**

- Upload + adapter detection (section 3.5)
- Service: `ingest_articles(job, file_path, options)` — port logic from `ingest_news_json.py`
- Expose stats after ingest: event type histogram, skipped opinion count, Gemini vs fallback count

**Frontend**

- Drag-and-drop upload zone
- **Preview table:** first 10 rows, matched ticker, proposed event type (dry-run mode optional)
- **Chart:** pie or bar — event type distribution after run
- **Recent events table** updates live

**Acceptance**

- User uploads Polygon JSON **or** a simple CSV with `ticker,headline,date` and pipeline completes ingest
- Same dedup rules as V1 (company + headline)
- `--prefer-events` behavior exposed as UI toggle

---

### Phase V2-E — Backtest UI (Phase C in browser)

**Backend**

- Service: `run_backtest_service()` — from `run_backtest.py`
- After job step: `GET /api/v1/market/patterns/` already exists; add summary endpoint for UI charts

**Frontend**

- **Patterns panel** during/after backtest: heatmap or table — `(event_type × relationship_type) → hit_rate`, color by sample_size
- Highlight patterns with `sample_size >= 5` in green; warn on thin samples
- Tooltip: “n=25, 80% hit, 10-day window”

**Acceptance**

- Backtest step shows progress while yfinance downloads (sub-progress: “Fetching prices for TSM…”)
- At least one pattern with n≥3 appears when ingest had real events

---

### Phase V2-F — Train model UI (Phase D in browser)

**Backend**

- Service: `train_model_service()` — from `train_model.py`
- `GET /api/v1/market/model/metrics/` — serve `metrics.json` safely (no path traversal)

**Frontend**

- **Model card:** accuracy, confusion matrix grid, top feature coefficients table
- Honest copy: “Modest accuracy is expected on small samples”
- Disable train button if labeled rows < 30 (show count from API)

**Acceptance**

- Metrics visible in browser after train step
- `model.joblib` regenerated on server

---

### Phase V2-G — Generate chains UI (Phase E in browser)

**Backend**

- Service: `generate_chains_service()` — from `generate_chains.py`
- Options in job: `limit`, `prefer_patterns`, `window`

**Frontend**

- **Chain generation progress:** “Writing explanation 12/40”
- On complete: link to `/chains` with confetti-free, serious UI — sorted by `backtest_hit_rate` desc
- **Chain detail** already exists — ensure new fields display

**Acceptance**

- 20+ chains generated from UI without terminal
- Explanations use Gemini when key set

---

### Phase V2-H — End-to-end verify & smoke (Phase F+G in browser)

**Backend**

- `POST /api/v1/pipeline/verify/` — runs lightweight checks: each endpoint returns 200, counts > 0 where expected

**Frontend**

- **Verify step:** checklist UI — green checkmarks per endpoint / edge case
- “Copy API base URL” for frontend devs

**Acceptance**

- One-click “Run full pipeline” from upload → chains → verify passes
- Empty symbol returns `[]` not 500 (already true in V1)

---

### Phase V2-I — Polish, rename frontend folder, docs

- Rename/consolidate: ensure repo uses `frontend/` only (remove duplicate workspace folder if still present locally)
- Root `README.md`: V2 setup, no terminal pipeline required
- Optional: rename product in UI from working title “Signal Chain” if user wants

---

## 5. UI/UX requirements (anti–“AI slop”)

Carry forward V1 frontend spec spirit:

- Dark, restrained financial research aesthetic
- Space Grotesk / Inter / JetBrains Mono
- No emoji, no glassmorphism-as-decoration, no fake “AI predicts” hero text
- Long operations: **determinate progress bar** + step label + elapsed time + cancel
- Errors: plain English + “what to do next” (e.g. “Gemini quota exceeded — increase delay in Settings”)

**Per-phase visual minimum:**

| Phase | Minimum UI artifact |
|-------|---------------------|
| Seed | Graph stats + live node/edge count |
| Ingest | Upload + preview + event-type chart |
| Backtest | Pattern table/heatmap with n and hit_rate |
| Train | Confusion matrix + coefficients |
| Chains | List + detail with hypothesis text |
| Verify | Checklist |

---

## 6. New API endpoints (summary checklist for implementers)

```
# Settings
GET  /api/v1/settings/llm/
PUT  /api/v1/settings/llm/
POST /api/v1/settings/llm/test/

# Pipeline
POST /api/v1/pipeline/upload/
POST /api/v1/pipeline/detect/
POST /api/v1/pipeline/jobs/
GET  /api/v1/pipeline/jobs/{id}/
GET  /api/v1/pipeline/jobs/{id}/events/     # SSE optional
POST /api/v1/pipeline/jobs/{id}/cancel/
POST /api/v1/pipeline/verify/

# Market extensions
GET  /api/v1/market/graph/stats/
GET  /api/v1/market/model/metrics/
GET  /api/v1/market/ingest/stats/           # last job histogram
```

---

## 7. Data model additions (suggested)

```python
class PipelineJob(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User, null=True)
    status = CharField  # pending|running|completed|failed|cancelled
    current_phase = CharField  # seed|ingest|backtest|train|chains|verify
    progress_percent = FloatField
    current_step = CharField
    upload_path = CharField
    adapter_id = CharField
    options_json = JSONField
    error_message = TextField(blank=True)
    created_at / updated_at

class PipelineLog(models.Model):
    job = ForeignKey(PipelineJob)
    level = CharField  # info|warning|error
    message = TextField
    created_at = DateTimeField(auto_now_add=True)

class UserSettings(models.Model):
    user = OneToOneField(User)
    gemini_api_key_encrypted = TextField(blank=True)
    gemini_model = CharField(default="gemini-3.1-flash-lite")
    ingest_delay_seconds = FloatField(default=2.0)
    prefer_events = BooleanField(default=True)
```

---

## 8. How to run V1 today (reference for testers)

**Backend**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_graph
export GEMINI_API_KEY=...   # V1 only; V2 uses Settings UI
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, signup, browse chains/patterns/explorer.

**Dataset:** place `polygon_news_sample.json` in `backend/data/` locally (not in git).

---

## 9. V1 lessons that MUST inform V2

1. **Gemini model:** use `gemini-3.1-flash-lite` by default; handle 429 with retry + delay.
2. **Opinion articles:** most of Polygon feed → `other`; use prefer-events filter in UI default ON.
3. **First ticker only** for multi-ticker articles — do not regress.
4. **CSRF:** SPA auth needs trusted origins + exempt or CSRF token strategy for POST auth.
5. **Price helper:** `market/data/prices.py` normalizes timezone-aware CSV indices — keep tests when refactoring.
6. **Do not commit:** API keys, `db.sqlite3`, large news JSON, `venv/`, `node_modules/`.

---

## 10. Suggested company additions for 50+ (starter list for Phase V2-A)

Add ~13+ symbols with clear graph edges (implementer should verify real relationships):

- **Technology:** CRM, ADBE, QCOM, TXN, MU
- **Consumer:** WMT, COST, PG, KO
- **Industrials:** UPS, FDX, DE
- **Healthcare:** ABBV, LLY
- **Energy:** OXY
- **Financials:** BAC, WFC

Add relationships such as: WMT↔AMZN (competitor), UPS/F DX as logistics peers, QCOM supplier to AAPL, MU/NVDA supplier links, etc. **Every new company should have at least 2 edges** or it will not contribute to backtest/chains.

---

## 11. Acceptance criteria for “V2 complete”

- [ ] User never needs terminal for a full demo (except `runserver` / `npm run dev` once)
- [ ] Gemini key configurable only in browser Settings
- [ ] Upload arbitrary supported news file → full pipeline → chains visible on `/chains`
- [ ] Progress bar + logs for ingest and chain generation (longest steps)
- [ ] Each phase has a visible UI artifact (chart/table/checklist)
- [ ] Graph has ≥50 companies and visibly denser explorer
- [ ] V1 management commands still work (backward compatibility)
- [ ] This MD file updated with any deviation from plan

---

## 12. Where the next AI should start

1. Read this file + skim `backend/market/management/commands/` (ingest, backtest, train, generate_chains).
2. Implement **V2-B** (Settings + encrypted key) and **V2-C** (job model + progress API) first — everything else hangs off this.
3. Then **V2-A** (expand seed JSON) in parallel with **V2-D** (upload + ingest service).
4. Wire **V2-E, F, G** as job steps reusing extracted services.
5. Finish **V2-H** verify screen.

**Do not** start with cosmetic dashboard tweaks before the job runner works.

---

## 13. Open questions for the user (resolve when starting V2 build)

1. **Single-user demo** vs **per-login settings** — if college demo is single laptop, UserSettings can attach to first superuser only.
2. **Reset database** between pipeline runs from UI? (“Clear all NewsEvents / chains” button — dangerous but useful for demos)
3. **Keep Node ingestion script** as course requirement? If yes, add a one-file `scripts/ingest-node/` that POSTs to upload API (optional).
4. **Rename repo/product** away from “Stock-Market-Future-Predictor” for academic honesty? (User decision.)

---

*End of V2 Master Plan. Update this file when phases ship or architecture changes.*
