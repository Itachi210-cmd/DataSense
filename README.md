# DataSense — Web-Based Data Analysis Platform

> A browser-based data analysis and transformation platform that lets users upload CSV/Excel datasets to perform cleaning, filtering, statistical exploration, pivot table generation, and visualization — with zero code.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐        ┌──────────────────────────────┐
│   Next.js 14 Frontend           │ <----> │   FastAPI Backend Engine         │ <----> │   Prisma ORM + SQLite /      │
│   (App Router, TypeScript, UI)  │  REST  │   (Python, Pandas Data Engine)   │  ORM   │   Supabase Postgres (Prod)   │
│   • Drag & Drop File Upload     │        │   • Pandas Delimiter/Encoding    │        │   • Dataset Metadata         │
│   • Spreadsheet Grid & Types    │        │   • Statistics & Type Inference  │        │   • Chart Configurations     │
│   • Next.js Prisma API Routes   │        │   • In-Memory Working Session    │        │                              │
└─────────────────────────────────┘        └──────────────────────────────────┘        └──────────────────────────────┘
```

### ⚠️ Architecture Note & Known Limitations (V1 Design)
- **Session Data vs. Metadata Split**: Actual row-level dataset arrays are processed and maintained **in-memory** in the FastAPI session store (`backend/app/services/session_store.py`). This gives ultra-fast Pandas performance without bloating database storage (Supabase free tier has a 500MB limit).
- **Persistence**: Dataset metadata (name, row count, column count, file type, timestamps) and chart configurations are permanently stored in **SQLite** (local development) and **Supabase Postgres** (production) via **Prisma ORM**.
- **Backend Restarts**: Restarting the Python backend clears active in-memory session frames; files can be re-uploaded or demo datasets reloaded with 1 click.

---

## 🚀 Status & Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Project Setup, Next.js Scaffold, FastAPI Backend, Prisma + SQLite, Demo Datasets | ✅ Completed |
| **Phase 1** | Drag & Drop Upload, Pandas Parser, Dataset Preview Grid, Column Stats, Metadata Persistence, Recent Datasets | ✅ Completed |
| **Phase 2** | Data Cleaning (Filter, Sort, Missing Values, Duplicates, Cell Edit, Type Conversion) | ⏳ Up Next |
| **Phase 3** | Data Analysis (Statistics, Group By Aggregations, Pivot Tables) | ⏳ Planned |
| **Phase 4** | Visualization (Chart Generator: Bar, Line, Pie, Scatter via Chart.js/Plotly) | ⏳ Planned |
| **Phase 5** | Export (Cleaned CSV/Excel, Analysis Summaries, Chart Images) | ⏳ Planned |
| **Phase 6** | Polish & Deployment (Vercel Frontend + Render/Railway Backend) | ⏳ Planned |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router, TypeScript), Tailwind CSS, Lucide Icons, React Context Store.
- **Backend**: FastAPI, Uvicorn, Pandas 2.x, NumPy, OpenPyXL, Python-Multipart.
- **Database**: SQLite (local development) / PostgreSQL (production) via Prisma ORM.
- **API Communication**: REST APIs with CORS enabled on `http://localhost:8000`.

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.9+ with `pip`

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python run.py
```
The FastAPI backend runs on `http://localhost:8000` (API Docs available at `http://localhost:8000/docs`).

### 3. Frontend Setup
```bash
cd frontend
npm install
npx prisma db push
npm run dev
```
The Next.js frontend runs on `http://localhost:3000`.

### 4. Running Backend Tests
```bash
cd backend
python test_backend.py
```

---

## 🌟 Key Features (Phases 0 & 1)

1. **Multi-Format Dataset Upload**: Drag-and-drop CSV, XLSX, and XLS uploads with automatic delimiter detection (comma, semicolon, tab), encoding fallback, and format validation.
2. **Instant Demo Datasets**: 1-click loading of bundled datasets (*Supermarket Sales* with 1,000 transactions and *Messy Customer Churn* with duplicate rows and missing values).
3. **Database Metadata Persistence**: Every uploaded or demo dataset metadata is automatically stored in SQLite via Prisma and displayed on the Home screen under **Recent Datasets**.
4. **Spreadsheet-Style Interactive Grid**: Sticky row numbers, sticky column headers with Excel letters (A, B, C...), data type badges (`Text`, `Number`, `Date`, `Boolean`), and prominent `<null>` indicators.
5. **Column Distribution Inspector**: Click any column header to view unique distinct values, null counts & %, sample values, and statistical measures (min, max, mean, median).
6. **Summary Metric Cards**: Live cards displaying Total Rows, Total Columns, Missing Cells (count + %), Duplicate Rows, Memory Size, and File Type.
