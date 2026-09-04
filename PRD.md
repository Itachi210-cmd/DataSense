# Product Requirements Document (PRD)
## DataSense — Web-Based Data Analysis Platform

---

## 1. Overview

A browser-based data analysis tool that lets a user upload a CSV/Excel dataset and perform cleaning, filtering, statistical analysis, pivot table generation, and visualization — without writing any code. Think of it as a lightweight, focused alternative to Excel + Power BI for quick, self-serve data exploration.

## 2. Problem Statement

Non-technical users (and even technical ones doing quick exploratory work) often need to clean a messy spreadsheet, run basic aggregations, and generate a chart — but full BI tools (Power BI, Tableau) are heavyweight, and spreadsheet software lacks guided workflows for cleaning and doesn't scale well for repeatable analysis tasks.

## 3. Target User

- Primary: the developer's own portfolio/interview use case — demonstrating full-stack + data-handling skills.
- Secondary (realistic persona): students, small-business owners, or analysts who need fast, no-code dataset cleaning and visualization.

## 4. Goals

- Ship a complete, working, demoable product (not a partial prototype).
- Demonstrate full-stack skill: frontend UI/UX, backend data processing, database persistence, deployment.
- Keep the core flow (Upload → Clean → Analyze → Visualize → Export) rock-solid before adding advanced features.

## 5. Non-Goals (V1)

- Multi-user collaboration / real-time shared editing
- Role-based access control / teams
- Connecting to live external databases (only file upload for V1)
- Mobile-native app (web-responsive is enough)

## 6. Core Features (V1 — MVP)

| # | Feature | Description |
|---|---|---|
| 1 | File Upload | CSV, XLS, XLSX upload with drag-and-drop |
| 2 | Dataset Preview | Spreadsheet-style table view with summary stats (rows, columns, missing values, duplicates) |
| 3 | Filtering | Column + condition-based filtering (equals, contains, >, <, between, etc.) |
| 4 | Sorting | Ascending/descending by column |
| 5 | Missing Value Handling | Remove rows, fill with custom/mean/median value |
| 6 | Duplicate Handling | Detect and remove duplicate rows |
| 7 | Manual Editing | Edit cells, add/delete rows and columns, rename columns |
| 8 | Data Type Conversion | Change column type (Text, Number, Date, Boolean) |
| 9 | Statistics | SUM, AVERAGE, COUNT, MIN, MAX, MEDIAN per column |
| 10 | Group By | Group by a column, aggregate a value column |
| 11 | Pivot Table | Rows × Columns × Values × Aggregation |
| 12 | Charts | Bar, Line, Pie, Scatter (via Chart.js/Plotly) |
| 13 | Export | Download cleaned data as CSV/Excel |
| 14 | Sample Dataset | "Try with demo data" for instant demoing |

## 7. Differentiator Features (V1.5 — Polish)

- AI-powered dataset summary ("Summarize this dataset" using a free LLM)
- Auto-suggested cleaning actions (e.g. "12 nulls found in Age — fill with mean?")
- Graceful error handling for bad/corrupt files

## 8. Deferred Features (V2)

- Dashboard Builder (combine multiple charts + metric cards, drag/resize/rearrange)
- "My Charts" saved library
- PDF report export
- Number/currency/date formatting options
- Undo/redo across cleaning operations

## 9. Success Criteria

- A user can go from raw messy CSV to a cleaned, visualized, exported result with zero code.
- The deployed link works reliably for a live interview demo.
- Core flow has no crashes on malformed/edge-case data (empty file, all-null column, single row, etc.)

## 10. Tech Stack (summary — see ARCHITECTURE.md)

Next.js (frontend) + FastAPI (backend, Python/Pandas) + SQLite (dev) → Supabase Postgres (prod) via Prisma ORM. Charts via Chart.js/Plotly. Hosted on Vercel (frontend) + Render/Railway (backend).
