# Design Document — UI Workflow
## DataSense — Web-Based Data Analysis Platform

---

## 1. Product Philosophy

The application follows a clear transformation pipeline:

```
RAW DATA → CLEAN DATA → ANALYZED DATA → VISUALIZED DATA → FINAL DASHBOARD
```

V1 is fully manual (user-driven). AI assistance is a later, additive layer — not a dependency for the core workflow.

## 2. Overall Product Flow

```
Home → Upload Dataset → Dataset Preview → Data Cleaning → Data Analysis
     → Visualization → Dashboard (V2) → Export
```

## 3. Screens

### 3.1 Home
- Product logo, name, short description
- "Upload Dataset" button (primary action)
- Recent projects/datasets list
- Short workflow explainer

### 3.2 Upload Dataset
- Drag-and-drop area + Browse Files button
- Supported formats: CSV, XLSX, XLS
- Shows: file name, size, upload progress, validation/error/success states
- Flow: Select File → Validate → Upload → Dataset Loaded → Preview

### 3.3 Dataset Preview
- Summary: name, file type, size, total rows/columns, missing values, duplicate rows
- Spreadsheet-style table (row numbers, column names, data type indicators)
- Actions: Start Cleaning / Edit Dataset / Continue to Analysis

### 3.4 Main App Navigation
Persistent sidebar once a dataset is loaded:
```
DATASET        → Preview
DATA CLEANING  → Overview, Filter, Sort, Missing Values, Duplicates, Edit Data, Data Types, Formatting
DATA ANALYSIS  → Overview, Statistics, Group By, Pivot Table
VISUALIZATION  → Create Chart, My Charts
DASHBOARD      → (V2)
EXPORT
```
Current dataset name stays visible in the header at all times.

### 3.5 Data Cleaning
- **Overview:** total rows/columns, missing values, duplicates, data type distribution
- **Filter:** Select Column → Condition (Equals/Not Equals/Contains/Starts With/Ends With/>/</Between) → Value → Apply. Actions: Apply / Clear / Reset.
- **Sort:** Select Column → Direction (Asc/Desc) → Apply
- **Missing Values:** per-column list (name, missing count/%, action). Actions: Remove rows / Fill custom / Fill mean / Fill median / Leave unchanged. Feedback: "23 missing values handled." + Undo where possible.
- **Duplicates:** shows count + preview. Actions: Review / Remove / Cancel. Feedback: "12 duplicate rows removed."
- **Edit Data:** edit cell, add/delete row, add/delete/rename column. Confirmation on destructive actions.
- **Data Types:** convert column to Text / Number / Date / Boolean.
- **Formatting:** Number, Currency, Percentage, Decimal places, Date format.

### 3.6 Data Analysis
- **Overview:** total rows/columns, numeric/text/date column counts
- **Statistics:** Select Column → Select Operation (SUM/AVG/COUNT/MIN/MAX/MEDIAN) → Calculate → Display result
- **Group By:** Select Grouping Column → Value Column → Aggregation → Generate Result (e.g. Region → Sales → SUM)
- **Pivot Table:** Rows / Columns / Values / Aggregation selectors → Generate → Review → Modify → Regenerate

### 3.7 Visualization
- **Create Chart** (4-step flow):
  1. Select chart type (Bar/Line/Pie/Scatter)
  2. Select data (X-axis, Y-axis, data column, aggregation)
  3. Configure (title, axis labels, legend, grouping)
  4. Preview → Edit / Duplicate / Delete / Add to Dashboard
- **My Charts:** saved chart list (preview, title, type, dataset name). Actions: Open / Edit / Duplicate / Delete / Add to Dashboard.

### 3.8 Dashboard Builder (V2)
- Dashboard title, metric cards, charts, add/remove/rearrange/resize/rename
- Example layout: top-row metric cards → large trend chart → two side-by-side charts

### 3.9 Export
- Dataset: CSV / Excel
- Analysis: Summary / Pivot Table
- Visualization: Individual Charts / Dashboard
- Optional: PDF Report
- Flow: Select Export Type → Select Content → Export → Success Message

## 4. Global UX Requirements

The app should always communicate:
- Current dataset, current section, current operation, changes made, current analysis state

Every screen should handle:
- Loading states
- Empty states
- Error states
- Success states
- Confirmation dialogs (for destructive actions)
- Undo actions where practical

## 5. Build Priority Note

This document describes the **full intended product**. For build order and what ships in V1 vs V2, see PHASES.md — Dashboard Builder and chart-library features are intentionally deferred so the core Upload → Clean → Analyze → Visualize → Export flow is complete and reliable first.
