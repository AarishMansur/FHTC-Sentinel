# FHTC Sentinel

Open-source, agentic audit console for **Jal Jeevan Mission (JJM) Functional Household Tap Connection (FHTC) coverage** — built government-facing (B2G) for **District Collectors and DWSS/PHED officers**. Starting with **Rajasthan**.

License: MIT

---

## The problem

Jal Jeevan Mission is one of the largest rural water programmes in the world, targeting tap-water connections to every rural household (~19.3 crore households across India). Progress is tracked through reported village-level FHTC coverage buckets (0%, 0–25%, ..., 100% FHTC), published via the JJM dashboard and resent as open data mirrors (ejalshakti.gov.in and Esri Living Atlas layers).

The numbers are **self-reported** and large enough that data errors matter:

- Districts report near-100% saturation while simultaneously reporting thousands of villages at 0% — impossible together.
- Year-over-year regressions appear (100%-coverage villages dropping, 0%-coverage villages rising), which are either infrastructure failures or reporting errors.
- No state-level tool currently flags which districts' figures are internally inconsistent and need **field verification first**.

FHTC Sentinel ingests the public district-level mirror, scores every district with deterministic rules, and hands officers a one-page, Hindi/English briefing of the top field checks — so verification effort goes where the data is least trustworthy.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Officer console (Next.js App Router, mobile-first)          │
│  /login  /dashboard  /district/[id]  /audit  /impact        │
└──────────────┬──────────────────────────────────────────────┘
               │ protected API routes (JWT cookie + role checks)
┌──────────────▼──────────────────────────────────────────────┐
│ Agents (server-side services)                               │
│  1. IngestAgent    — ArcGIS REST → normalized Snapshots     │
│  2. AnomalyAgent   — deterministic rules → Flags (0–100)    │
│  3. BriefingAgent  — DB-only numbers → EN/HI briefings      │
└───────┬───────────────────────────────────────┬─────────────┘
        │                                       │
┌───────▼───────────────┐            ┌────────▼────────────┐
│ PostgreSQL (Prisma)   │            │ Esri Living Atlas   │
│ District · Snapshot · │            │ JJM FHTC district   │
│ Flag · Briefing ·     │            │ feature layer       │
│ AuditLog              │            │ (ArcGIS REST)       │
└───────────────────────┘            └─────────────────────┘
```

Every agent run writes an **AuditLog** row with SHA-256 input/output hashes, the rule/prompt version, and structured metadata — so any flag or briefing can be traced to the exact run that produced it.

How agents are used, concretely:

| Agent | Trigger | Artifacts | Deterministic? |
|---|---|---|---|
| **IngestAgent** | Admin *Sync now*, nightly cron, `npm run sync:now` | `District`, `Snapshot`, audit row | Yes (pure ETL; live J8 scrape → offline fallback) |
| **AnomalyAgent** | Admin *Score now* | `Flag` rows with 0–100 score + evidence | Yes — LLM never used for scoring |
| **BriefingAgent** | *Generate briefing* on a district page | `Briefing` (en + hi) + audit row | Yes — all numbers come only from DB rows passed in |

### J8 scoring rules

When a district's latest snapshot comes from the Har Ghar Jal report, the AnomalyAgent applies source-honest rules:

1. **Unreported villages** — ≥20% of villages have no Har Ghar Jal data reported (coverage status unknown). Score = the share itself.
2. **Certification gap** — ≥40% of *reported* villages are not yet certified (e.g. Ganganagar: 722/1531 = 47%). Score = the gap share; ≥70% is critical.
3. **YoY regression** — certified share drops ≥5 points or unreported share rises ≥5 points between financial years.

The original bucket rules (high 0% share, tension, YoY bucket regression, state-median outlier) still run for districts whose snapshots come from the Esri FHTC bucket layer.

---

## Scoring rules (AnomalyAgent)

Scores are 0–100 (higher = more inconsistent), severity 1–5. The score drives severity (`>=80 → 5`, `>=60 → 4`, `>=40 → 3`).

1. **High 0% share** — ≥10% of villages at 0% FHTC in the latest year. Score ≈ share itself.
2. **Tension** — ≥85% of villages at 100% FHTC **while** ≥3% are at 0%. Score = `full% − 2×zero%`.
3. **YoY regression** — two ways to trigger: the 100% bucket **drops** ≥5 points from the previous year (score = drop × 4), or the 0% bucket **rises** ≥3 points (score = rise × 8).
4. **Outlier** — the district's 0% share is ≥2 standard deviations from the state median (z-scaled to ~0–100, std from the state's latest-year distribution).

Scoring is **idempotent**: each run replaces the previous flags for the state (atomic delete + create), so repeated runs never duplicate or accumulate flags.

---

## Data sources

**Primary (live, official):** the **ejalshakti.gov.in "Har Ghar Jal" district report (Format J8)** — villages reported vs certified, per district, per financial year. Scraped through the public report page (no API key, no dependencies) via `lib/ingest/jjmHarGhar.mjs`, which exports `fetchHarGharJal()` for the sync job and also runs standalone:

```bash
node lib/ingest/jjmHarGhar.mjs 27        # 27 = Rajasthan; optional 2nd arg: finyear e.g. 2026-2027
```

Verified live pull: all 41 Rajasthan districts (FY 2026-2027; 42,448 villages, 13,668 reported, 7,308 certified, **6,360 reported-but-not-certified** — the core QA signal this app flags, e.g. Ganganagar's 722-village gap).

**Fallback (offline):** `data/rajasthanHarGharJal.ts` (and its JSON twin used by the seed script) holds the full 2026-11-10 dataset copy, so the seed and demos work even when the government site is down. The sync automatically falls back to it (recorded as a `live_source_unavailable_using_fallback_snapshot` warning) when the live fetch fails.

**Secondary (configurable):** the Esri Living Atlas JJM district FHTC bucket layer remains supported via [`config/esri.ts`](config/esri.ts) (`source: 'esri'` on `/api/sync`) for when you have a real layer URL and bucket fields mapped.

- The J8 state-code map lives in `lib/ingestAgent.ts` (`27 → Rajasthan`, code prefix `RJ-`); district codes are derived as `RJ-<NAME>` because the J8 report has no district codes.
- The J8 finyear (e.g. `2026-2027`) is stored as the snapshot's end year (2027).
- **Important caveat:** ejalshakti is an ASP.NET page; the parser depends on its current HTML shape. If it changes, `fetchHarGharJal()` fails cleanly and the fallback dataset takes over — never invented zeros. This is public JJM reporting data, not a contract-stable API.

---

## Setup (local)

```bash
cp env.example .env                          # set DATABASE_URL, JWT_SECRET, CRON_SECRET
npm install
npx prisma generate
npx prisma db push                           # or: prisma migrate deploy
npm run db:seed                              # seeds the 41 real Rajasthan districts (J8 snapshot)
npm run dev                                  # http://localhost:3000
npm run score:now                            # run the anomaly rules once (needs the app running)
npm run sync:now                             # optional: refresh from the live ejalshakti site
```

Seeded accounts (password `demo123`):

| Email | Role | Scope |
|---|---|---|
| `collector@ajmer.gov.in` | collector | Ajmer only |
| `collector@jaipur.gov.in` | collector | Jaipur only |
| `state@jjm.gov.in` | state_admin | whole state |
| `viewer@demo.gov.in` | viewer | read-only |

### Docker Compose

```bash
docker compose up
```

(brings up Postgres 15 + web on :3000, runs `prisma db push` and seed automatically).

### Sync & scoring commands

```bash
npm run sync:now         # POST /api/sync (Rajasthan) — needs app running; non-zero exit on errors/failures
npm run sync:cron        # same, plus a lock file so repeated cron triggers are safe (default: 20h gate)
npm run sync:cron ...    # honors CRON_SECRET from .env; SYNC_URL/APP_URL target any deploy
```

The app also has an admin-only **Sync now** and **Score now** flow via `/api/sync` and `/api/score` — both require a logged-in `state_admin` (or the `x-cron-secret` header).

---

## API surface (write routes — all server-side auth + Zod-validated)

| Route | Method | Who | Notes |
|---|---|---|---|
| `/api/sync` | POST | `state_admin` **or** `x-cron-secret` header | Asks IngestAgent to pull and upsert one state |
| `/api/score` | POST | `state_admin`, `collector` (own state) | Replaces flags with the fresh run |
| `/api/briefing` | POST | `state_admin`, `collector` (own district) | Regenerates deterministic EN+HI briefings |
| `/api/export/flags` | GET/POST | `state_admin`, `collector` (own state) | CSV download |
| `/api/auth/*` | GET/POST | public login/logout/whoami | JWT via HttpOnly cookie (8h) |

Error taxonomy: `400 invalid_input/invalid_json`, `401 unauthenticated`, `403 forbidden/forbidden_state/forbidden_district`, `404 district_not_found`, `500 *_failed`.

---

## Deployment

**Web on Vercel, DB on Neon or Railway:**

1. Create a Postgres DB (Neon/Railway). Set `DATABASE_URL` in Vercel project env.
2. Set `JWT_SECRET` (≥20 chars, strong) and `CRON_SECRET` in Vercel env. Deployment **refuses to work** without a strong `JWT_SECRET` in production.
3. Optional: set `ESRI_*` env overrides if the live layer field names differ from `config/esri.ts` defaults.
4. `npx prisma db push` (or a migrate deploy step) against the prod DB once.
5. Deploy; then log in as a `state_admin`, hit **Sync now**, then **Score now**.

**Nightly cron (choose one):**

- GitHub Actions, e.g.:

```yaml
on:
  schedule:
    - cron: '0 21 * * *'   # 02:30 IST
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST "$SYNC_URL/api/sync" \
            -H 'Content-Type: application/json' \
            -H "x-cron-secret: $CRON_SECRET" \
            -d '{"state":"Rajasthan"}'
        env:
          SYNC_URL: ${{ secrets.SYNC_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

- Or a platform cron that runs `npm run sync:cron` with `SYNC_URL`/`CRON_SECRET` in env.

**No secrets are committed** — `env.example` is the template; real secrets live in `.env` / platform env vars only.

---

## Data caveats

- The Esri Living Atlas layer is a mirror of JJM figures; it may lag or diverge from the official `ejalshakti` dashboard.
- Year values (2023/2024/2025 buckets) are only ingested when the mapped source fields actually exist on the layer. If fields differ, mapping must be fixed in `config/esri.ts` / env overrides — the app will not invent zeros.
- Flags indicate **data inconsistency**, not ground truth: a flagged district may be perfectly fine on the ground and simply misreporting — that's exactly why output is an ordered list of field checks for verification.
- Briefings are generated **deterministically**. Every number in a briefing comes from stored `Snapshot`/`Flag` rows; nothing is generated or estimated. Audit rows record `llmUsed: false` per briefing so this stays visible.

---

## Demo walkthrough (for judges)

1. `npm run dev` and open `/login`, sign in as `state@jjm.gov.in` / `demo123`.
2. **Sync now** (needs a reachable `ESRI_BASE_URL`; with the default demo seed, districts/snapshots are already in). Then **Score now** produces flags.
3. `/dashboard`: state strip (districts scored/flagged, 0% bucket villages, regressions) and the district table sorted by risk with heat-coloured bars.
4. Click any district → bucket chart across 2023–2025, flags with explanations and evidence JSON, then **Generate briefing** → deterministic one-pager in EN + HI with top field checks, printable via **Print view**.
5. `/audit`: every agent run with input/output hashes and rule versions.
6. `/impact`: auto-computed "proven impact" panel from the last sync — districts audited, severity breakdown, villages in the 0% bucket, regressions, timestamp.

---

## Repo layout

```
app/                  Next.js App Router: pages + API routes
app/api/              sync · score · briefing · export/flags · auth
lib/                  prisma client, auth, agents (ingest, anomaly, briefing)
config/esri.ts        the one file that maps the ArcGIS layer to our model
prisma/schema.prisma  District, Snapshot, Flag, Briefing, AuditLog
prisma/seed.js        deterministic seed script
scripts/              sync-now.js (direct sync), cron-sync.js (lock + cron safe-run)
```

## License

MIT
