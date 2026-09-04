# Architecture Document
## DataSense — Web-Based Data Analysis Platform

---

## 1. High-Level Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│   Next.js UI    │ <----> │   FastAPI Backend │ <----> │  Database         │
│  (Vercel)       │  REST  │  (Render/Railway) │  ORM   │  SQLite (dev) /    │
│                 │        │  Pandas engine    │        │  Supabase Postgres │
└─────────────────┘        └──────────────────┘        │  (prod, via Prisma)│
                                                          └──────────────────┘
```

- **Frontend (Next.js):** UI, file upload, editable data grid, chart rendering, pivot table UI, calls backend APIs.
- **Backend (FastAPI + Pandas):** All heavy data operations — parsing, cleaning, filtering, aggregation, pivoting.
- **Database (Prisma ORM):** Stores dataset metadata, saved datasets/sessions, chart configs. SQLite for local dev, Postgres (Supabase) for production.

## 2. Why This Stack

- **Next.js**: already used in prior projects (HomeConnect AI) — fast iteration, easy Vercel deploy.
- **FastAPI over Flask**: async support, automatic OpenAPI docs, faster for data-heavy endpoints.
- **Pandas**: industry-standard for cleaning/filtering/pivoting — directly maps to the feature set (fillna, drop_duplicates, pivot_table, groupby).
- **Prisma + SQLite → Postgres**: same ORM code in dev and prod, only the provider line changes at deploy time. Avoids Vercel's serverless file-persistence problem (SQLite files don't persist across serverless invocations).
- **Chart.js/Plotly**: ready-made libraries, avoids reinventing chart rendering, fast to integrate.

## 3. Data Flow (Typical Request)

1. User uploads file in Next.js → sent to FastAPI `/upload`.
2. FastAPI parses file with Pandas, stores a working copy (in-memory/session or temp table), returns dataset summary + preview rows as JSON.
3. User applies a cleaning/filter/pivot action in the UI → Next.js calls the relevant FastAPI endpoint (`/clean`, `/filter`, `/pivot`, `/chart-data`) with the current dataset reference + operation params.
4. FastAPI applies the Pandas operation, returns updated data/summary.
5. Next.js re-renders table/chart with new data.
6. On export, FastAPI converts current dataset state back to CSV/XLSX and returns a downloadable file.

## 4. Backend API Surface (Draft)

| Endpoint | Purpose |
|---|---|
| `POST /upload` | Parse uploaded CSV/XLSX, return dataset ID + preview + summary |
| `POST /clean/missing` | Handle missing values (drop/fill mean/median/custom) |
| `POST /clean/duplicates` | Detect/remove duplicate rows |
| `POST /clean/edit` | Cell edit, add/delete row/column, rename column |
| `POST /clean/dtype` | Convert column data type |
| `POST /filter` | Apply column/condition-based filter |
| `POST /sort` | Sort by column + direction |
| `POST /analysis/stats` | Compute SUM/AVG/COUNT/MIN/MAX/MEDIAN for a column |
| `POST /analysis/groupby` | Group by column + aggregate value column |
| `POST /analysis/pivot` | Generate pivot table (rows × columns × values × agg) |
| `POST /chart-data` | Return data shaped for a given chart type/axes |
| `GET /export` | Export current dataset state as CSV/XLSX |

## 5. Database Schema (Prisma — Draft)

```prisma
model Dataset {
  id          String   @id @default(cuid())
  name        String
  fileType    String
  rowCount    Int
  columnCount Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  charts      Chart[]
}

model Chart {
  id         String   @id @default(cuid())
  datasetId  String
  dataset    Dataset  @relation(fields: [datasetId], references: [id])
  type       String   // bar, line, pie, scatter
  config     Json      // axes, aggregation, title, etc.
  createdAt  DateTime @default(now())
}
```

Note: actual dataset rows (the uploaded data itself) are handled in-memory/session on the backend for V1 rather than stored row-by-row in Postgres, to keep the DB lightweight (Supabase free tier is 500MB). Only metadata + saved chart configs are persisted.

## 6. Hosting Plan

- **Frontend:** Vercel (free tier, Next.js native support)
- **Backend:** Render or Railway (FastAPI needs a long-running Python process — not ideal on Vercel serverless)
- **Database:** Supabase Postgres (free tier: 500MB DB, 1GB storage) for production; SQLite for local dev
- **Note:** Supabase free-tier projects pause after 7 days of inactivity — resume manually before a demo/interview.

## 7. Known Constraints

- Supabase free tier: 500MB DB, 5GB bandwidth/month, pauses after 1 week idle.
- Vercel serverless functions are not suited for long-running Python/Pandas processing — hence separate backend hosting.
- Large file uploads (very large CSVs) may need chunked processing later; V1 assumes reasonably sized demo datasets.
