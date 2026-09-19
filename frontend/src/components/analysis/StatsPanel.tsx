"use client";

import React, { useState, useEffect } from "react";
import { DatasetSummary, StatsResponse } from "@/lib/types";
import { calculateColumnStats } from "@/lib/api";
import { 
  Calculator, 
  TrendingUp, 
  Hash, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

interface StatsPanelProps {
  summary: DatasetSummary;
}

export default function StatsPanel({ summary }: StatsPanelProps) {
  const numericColumns = summary.columns.filter((c) => c.data_type === "Number");
  const allColumns = summary.columns;

  const [selectedColumn, setSelectedColumn] = useState<string>(
    numericColumns.length > 0 ? numericColumns[0].name : allColumns[0]?.name || ""
  );
  const [selectedOp, setSelectedOp] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatsResponse | null>(null);

  const fetchStats = async (col: string, op: string) => {
    if (!col) return;
    setLoading(true);
    setError(null);
    try {
      const res = await calculateColumnStats(summary.id, {
        column: col,
        operation: op === "all" ? undefined : (op as any),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to calculate column statistics");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedColumn) {
      fetchStats(selectedColumn, selectedOp);
    }
  }, [selectedColumn, selectedOp, summary.id]);

  const formatVal = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "N/A";
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const colMeta = summary.columns.find((c) => c.name === selectedColumn);

  return (
    <div className="space-y-6">
      {/* Configuration Controls */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Column Selector */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Select Column to Analyze</span>
              {colMeta && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  colMeta.data_type === "Number"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {colMeta.data_type}
                </span>
              )}
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <optgroup label="Numeric Columns (Recommended for Math Stats)">
                {numericColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} (Number)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Columns (Count & Nulls Only)">
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

          {/* Operation Selector */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Operation Scope
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Full Profile" },
                { id: "sum", label: "SUM" },
                { id: "avg", label: "AVG" },
                { id: "median", label: "MEDIAN" },
                { id: "min", label: "MIN" },
                { id: "max", label: "MAX" },
                { id: "std", label: "STD DEV" },
              ].map((op) => (
                <button
                  key={op.id}
                  onClick={() => setSelectedOp(op.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedOp === op.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750 border border-slate-700/60"
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-rose-200">Calculation Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
          <span>Calculating statistical metrics for '{selectedColumn}'...</span>
        </div>
      )}

      {/* Results Display */}
      {!loading && result && (
        <div className="space-y-4">
          {/* Data Distribution Bar */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Column: <strong className="text-slate-200">{result.column}</strong> ({result.data_type})
              </span>
              <span className="text-slate-400">
                Total Rows: <strong className="text-slate-200">{result.total_count.toLocaleString()}</strong>
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500" 
                style={{ width: `${result.total_count > 0 ? (result.non_null_count / result.total_count) * 100 : 0}%` }} 
                title={`Non-null: ${result.non_null_count}`}
              />
              <div 
                className="h-full bg-rose-500" 
                style={{ width: `${result.total_count > 0 ? (result.null_count / result.total_count) * 100 : 0}%` }} 
                title={`Null: ${result.null_count}`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="text-emerald-400">
                ● Non-null: {result.non_null_count.toLocaleString()} ({((result.non_null_count / Math.max(1, result.total_count)) * 100).toFixed(1)}%)
              </span>
              <span className="text-rose-400">
                ● Null / Missing: {result.null_count.toLocaleString()} ({((result.null_count / Math.max(1, result.total_count)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SUM (Total)</p>
              <p className="mt-1 text-lg font-bold text-white font-mono truncate" title={formatVal(result.stats.sum)}>
                {formatVal(result.stats.sum)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Summation of non-null values</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AVG (Mean)</p>
              <p className="mt-1 text-lg font-bold text-indigo-300 font-mono truncate" title={formatVal(result.stats.avg)}>
                {formatVal(result.stats.avg)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Arithmetic average</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MEDIAN (50th %)</p>
              <p className="mt-1 text-lg font-bold text-cyan-300 font-mono truncate" title={formatVal(result.stats.median)}>
                {formatVal(result.stats.median)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Middle sorted value</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">COUNT (N)</p>
              <p className="mt-1 text-lg font-bold text-emerald-300 font-mono truncate" title={formatVal(result.stats.count)}>
                {formatVal(result.stats.count)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Valid population count</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MINIMUM</p>
              <p className="mt-1 text-lg font-bold text-amber-300 font-mono truncate" title={formatVal(result.stats.min)}>
                {formatVal(result.stats.min)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Smallest observation</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MAXIMUM</p>
              <p className="mt-1 text-lg font-bold text-amber-300 font-mono truncate" title={formatVal(result.stats.max)}>
                {formatVal(result.stats.max)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Largest observation</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">STD DEVIATION</p>
              <p className="mt-1 text-lg font-bold text-purple-300 font-mono truncate" title={formatVal(result.stats.std)}>
                {formatVal(result.stats.std)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Sample variance spread</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">RANGE (Max - Min)</p>
              <p className="mt-1 text-lg font-bold text-slate-200 font-mono truncate">
                {result.stats.max !== null && result.stats.min !== null
                  ? formatVal(result.stats.max - result.stats.min)
                  : "N/A"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Spread width</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
