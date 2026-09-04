# Development Phases
## DataSense — Web-Based Data Analysis Platform

---

## Guiding Principle

Ship the **core flow** (Upload → Clean → Analyze → Visualize → Export) completely and reliably before adding advanced/complex UI features like the Dashboard Builder. A focused, polished, bug-free product demos better than a broad, half-finished one.

---

## Phase 0 — Setup

- Next.js project scaffold + FastAPI backend scaffold
- Prisma + SQLite for local dev
- Basic routing/navigation shell (sidebar, header with dataset name)
- Sample dataset prepared for demo/testing

## Phase 1 — Upload & Preview

- File upload (CSV/XLS/XLSX) with drag-and-drop, validation, progress/error/success states
- Backend `/upload` endpoint (Pandas parsing)
- Dataset Preview screen: summary stats + spreadsheet-style table

## Phase 2 — Data Cleaning

- Filter (column + condition + value)
- Sort (column + direction)
- Missing values (remove/fill mean/median/custom) + feedback messages
- Duplicates (detect/remove) + feedback messages
- Edit Data (cell edit, add/delete row/column, rename column)
- Data type conversion

## Phase 3 — Data Analysis

- Statistics (SUM/AVG/COUNT/MIN/MAX/MEDIAN)
- Group By (grouping column + value column + aggregation)
- Pivot Table (rows × columns × values × aggregation)

## Phase 4 — Visualization

- Create Chart flow (type → data → configure → preview)
- Bar, Line, Pie, Scatter chart types via Chart.js/Plotly
- Chart edit/duplicate/delete

## Phase 5 — Export

- Export cleaned dataset (CSV/Excel)
- Export analysis summary / pivot table
- Export individual charts

## Phase 6 — Polish & Deploy

- Sample dataset "Try with demo data" button
- Graceful error handling (bad format, empty/corrupt file, edge cases: all-null column, single row, etc.)
- Loading/empty/error/success states across all screens
- Switch Prisma provider from SQLite → Supabase Postgres
- Deploy frontend (Vercel) + backend (Render/Railway)
- README with screenshots + architecture diagram

**→ V1 is CV/interview-ready at the end of Phase 6.**

---

## V1.5 — Differentiators (if time allows before interviews)

- AI-powered dataset summary ("Summarize this dataset")
- Auto-suggested cleaning actions (e.g. "12 nulls found — fill with mean?")

## V2 — Deferred / Post-CV-deadline

- Dashboard Builder (add/remove/rearrange/resize charts + metric cards)
- "My Charts" saved library with Add to Dashboard
- PDF report export
- Formatting options (currency, percentage, date formats)
- Undo/redo across cleaning operations

---

## Suggested Order of Attack (if using AI-assisted coding)

1. Scaffold + Upload + Preview (Phase 0–1) — gets a visible, demoable slice fastest
2. Cleaning (Phase 2) — most-used feature set, test with sample messy data early
3. Analysis (Phase 3) — statistics and pivot logic need careful manual verification (edge cases: all-null columns, single-row datasets, non-numeric columns in numeric operations)
4. Visualization (Phase 4)
5. Export (Phase 5)
6. Polish + Deploy (Phase 6) — do this properly, don't rush; a broken deployed link is worse than no link
