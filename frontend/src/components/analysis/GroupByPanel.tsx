"use client";

import React, { useState } from "react";
import { DatasetSummary, GroupByResponse } from "@/lib/types";
import { calculateGroupBy, exportGroupByCsv } from "@/lib/api";
import { 
  Layers, 
  Play, 
  Download, 
  AlertTriangle, 
  AlertCircle, 
  Check, 
  RefreshCw,
  Plus,
  X
} from "lucide-react";

interface GroupByPanelProps {
  summary: DatasetSummary;
}

export default function GroupByPanel({ summary }: GroupByPanelProps) {
  const numericColumns = summary.columns.filter((c) => c.data_type === "Number");
  const allColumns = summary.columns;

  // Default grouping with categorical column if present
  const defaultGroupCol = allColumns.find((c) => c.data_type === "Text")?.name || allColumns[0]?.name || "";
  const defaultValueCol = numericColumns[0]?.name || allColumns[0]?.name || "";

  const [selectedGroupCols, setSelectedGroupCols] = useState<string[]>([defaultGroupCol]);
  const [selectedValueCol, setSelectedValueCol] = useState<string>(defaultValueCol);
  const [aggregation, setAggregation] = useState<"sum" | "avg" | "count" | "min" | "max" | "median">("sum");
  
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GroupByResponse | null>(null);

  const toggleGroupCol = (colName: string) => {
    if (selectedGroupCols.includes(colName)) {
      if (selectedGroupCols.length > 1) {
        setSelectedGroupCols(selectedGroupCols.filter((c) => c !== colName));
      }
    } else {
      setSelectedGroupCols([...selectedGroupCols, colName]);
    }
  };

  const handleRun = async () => {
    if (selectedGroupCols.length === 0 || !selectedValueCol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await calculateGroupBy(summary.id, {
        group_by: selectedGroupCols,
        value_column: selectedValueCol,
        aggregation,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to execute group by aggregation");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportGroupByCsv(summary.id, {
        group_by: result.group_by,
        value_column: result.value_column,
        aggregation: result.aggregation.toLowerCase() as any,
      });
    } catch (err: any) {
      alert("Failed to export Group By CSV: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Builder */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            1. Group By Dimensions (Select 1 or more columns)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allColumns.map((col) => {
              const isSelected = selectedGroupCols.includes(col.name);
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => toggleGroupCol(col.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{col.name}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    col.data_type === "Number" ? "text-blue-300" : "text-slate-400"
                  }`}>
                    {col.data_type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-800/60 items-end">
          {/* Value Column */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              2. Target Value Column
            </label>
            <select
              value={selectedValueCol}
              onChange={(e) => setSelectedValueCol(e.target.value)}
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

          {/* Aggregation Function */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              3. Aggregation Function
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["sum", "avg", "count", "min", "max", "median"] as const).map((agg) => (
                <button
                  key={agg}
                  type="button"
                  onClick={() => setAggregation(agg)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    aggregation === agg
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {agg}
                </button>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <div className="md:col-span-3">
            <button
              onClick={handleRun}
              disabled={loading || selectedGroupCols.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Run Group By</span>
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

      {/* Results View */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Aggregated Results
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {result.total_groups.toLocaleString()} total groups
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {result.rows.length} rows displayed
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

          {/* Grid Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60 max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="py-2.5 px-3 font-semibold border-b border-slate-800 w-12 text-center">#</th>
                  {result.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 font-semibold border-b border-slate-800">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {result.rows.map((row, idx) => {
                  const aggColName = result.columns[result.columns.length - 1];
                  return (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2 px-3 text-slate-500 text-center text-[11px]">{idx + 1}</td>
                      {result.columns.map((col) => {
                        const isAggCol = col === aggColName;
                        const val = row[col];
                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 truncate max-w-xs ${
                              isAggCol ? "font-bold text-indigo-300" : "text-slate-200"
                            }`}
                          >
                            {val !== null && val !== undefined
                              ? typeof val === "number"
                                ? val.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                : String(val)
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
