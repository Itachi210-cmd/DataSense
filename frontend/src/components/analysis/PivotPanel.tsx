"use client";

import React, { useState } from "react";
import { DatasetSummary, PivotResponse } from "@/lib/types";
import { calculatePivot, exportPivotCsv } from "@/lib/api";
import { 
  Table2, 
  Play, 
  Download, 
  AlertTriangle, 
  AlertCircle, 
  Check, 
  RefreshCw,
  Plus
} from "lucide-react";

interface PivotPanelProps {
  summary: DatasetSummary;
}

export default function PivotPanel({ summary }: PivotPanelProps) {
  const numericColumns = summary.columns.filter((c) => c.data_type === "Number");
  const categoricalColumns = summary.columns.filter((c) => c.data_type !== "Number");
  const allColumns = summary.columns;

  const defaultRowCol = categoricalColumns[0]?.name || allColumns[0]?.name || "";
  const defaultColCol = categoricalColumns.length > 1 ? categoricalColumns[1].name : (allColumns[1]?.name || allColumns[0]?.name || "");
  const defaultValueCol = numericColumns[0]?.name || allColumns[0]?.name || "";

  const [rowIndexCols, setRowIndexCols] = useState<string[]>([defaultRowCol]);
  const [columnCols, setColumnCols] = useState<string[]>([defaultColCol]);
  const [valueCol, setValueCol] = useState<string>(defaultValueCol);
  const [aggregation, setAggregation] = useState<"sum" | "avg" | "count" | "min" | "max" | "median">("sum");
  const [fillValue, setFillValue] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PivotResponse | null>(null);

  const toggleRowCol = (colName: string) => {
    if (rowIndexCols.includes(colName)) {
      if (rowIndexCols.length > 1) {
        setRowIndexCols(rowIndexCols.filter((c) => c !== colName));
      }
    } else {
      setRowIndexCols([...rowIndexCols, colName]);
    }
  };

  const toggleColCol = (colName: string) => {
    if (columnCols.includes(colName)) {
      if (columnCols.length > 1) {
        setColumnCols(columnCols.filter((c) => c !== colName));
      }
    } else {
      setColumnCols([...columnCols, colName]);
    }
  };

  const handleRun = async () => {
    if (rowIndexCols.length === 0 || columnCols.length === 0 || !valueCol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await calculatePivot(summary.id, {
        index: rowIndexCols,
        columns: columnCols,
        values: valueCol,
        aggregation,
        fill_value: Number(fillValue),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate pivot table");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportPivotCsv(summary.id, {
        index: result.index_columns,
        columns: columnCols,
        values: valueCol,
        aggregation,
        fill_value: Number(fillValue),
      });
    } catch (err: any) {
      alert("Failed to export Pivot CSV: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Builder */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4">
        {/* Row Dimensions */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            1. Row Dimension (Index)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allColumns.map((col) => {
              const isSelected = rowIndexCols.includes(col.name);
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => toggleRowCol(col.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column Dimensions */}
        <div className="pt-2 border-t border-slate-800/60">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            2. Column Dimension (Pivot Header)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allColumns.map((col) => {
              const isSelected = columnCols.includes(col.name);
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => toggleColCol(col.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Value + Aggregation + Fill */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-800/60 items-end">
          {/* Target Value */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              3. Summarized Value
            </label>
            <select
              value={valueCol}
              onChange={(e) => setValueCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <optgroup label="Numeric Columns">
                {numericColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} (Number)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Columns (COUNT only)">
                {allColumns
                  .filter((c) => c.data_type !== "Number")
                  .map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.data_type})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Aggregation */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              4. Aggregation
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["sum", "avg", "count", "min", "max", "median"] as const).map((agg) => (
                <button
                  key={agg}
                  type="button"
                  onClick={() => setAggregation(agg)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    aggregation === agg
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {agg}
                </button>
              ))}
            </div>
          </div>

          {/* Fill Value */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Fill Empty
            </label>
            <input
              type="number"
              value={fillValue}
              onChange={(e) => setFillValue(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Run Button */}
          <div className="md:col-span-2">
            <button
              onClick={handleRun}
              disabled={loading || rowIndexCols.length === 0 || columnCols.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Build Pivot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-rose-200">Execution Blocked</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* High-Cardinality Warning */}
      {result?.warning && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{result.warning}</span>
        </div>
      )}

      {/* Pivot Matrix Table */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Pivot Matrix
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {result.total_rows} rows × {result.total_columns - result.index_columns.length} columns
              </span>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className={`w-3.5 h-3.5 text-emerald-400 ${exporting ? "animate-bounce" : ""}`} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60 max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/90 text-slate-300 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  {result.columns.map((col, idx) => {
                    const isIndex = result.index_columns.includes(col);
                    return (
                      <th
                        key={idx}
                        className={`py-2.5 px-3 font-semibold border-b border-slate-800 whitespace-nowrap ${
                          isIndex ? "bg-slate-900 text-slate-200" : "text-purple-300 text-right"
                        }`}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {result.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                    {result.columns.map((col, cIdx) => {
                      const isIndex = result.index_columns.includes(col);
                      const val = row[col];
                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-3 whitespace-nowrap ${
                            isIndex
                              ? "font-medium text-slate-300 bg-slate-950/50"
                              : "text-right text-indigo-300 font-bold"
                          }`}
                        >
                          {val !== null && val !== undefined
                            ? typeof val === "number"
                              ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : String(val)
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
