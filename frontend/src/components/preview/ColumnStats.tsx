"use client";

import React from "react";
import { ColumnMeta } from "@/lib/types";
import { 
  X, 
  BarChart2, 
  Binary, 
  Layers, 
  Hash, 
  Calendar, 
  Type, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";

interface ColumnStatsProps {
  column: ColumnMeta | null;
  onClose: () => void;
}

export default function ColumnStats({ column, onClose }: ColumnStatsProps) {
  if (!column) return null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Number":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          icon: Hash,
        };
      case "Date":
        return {
          bg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
          icon: Calendar,
        };
      case "Boolean":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: Binary,
        };
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
          icon: Type,
        };
    }
  };

  const badge = getTypeBadge(column.data_type);
  const TypeIcon = badge.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-indigo-400 flex items-center justify-center">
              {column.letter}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 truncate max-w-[280px]">
                  {column.name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
                >
                  <TypeIcon className="w-3 h-3" />
                  {column.data_type}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Index #{column.index + 1} • Original dtype: <code className="text-slate-300 font-mono">{column.original_dtype}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Distribution Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500">Non-Null</span>
            <p className="text-base font-bold text-slate-100 mt-0.5">
              {column.non_null_count.toLocaleString()}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500">Missing (Null)</span>
            <p className={`text-base font-bold mt-0.5 ${column.null_count > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {column.null_count.toLocaleString()} ({column.null_percentage}%)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500">Unique Values</span>
            <p className="text-base font-bold text-indigo-300 mt-0.5">
              {column.unique_count.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Numeric Statistics (if applicable) */}
        {column.data_type === "Number" && (
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Statistical Summary
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">MIN</span>
                <span className="font-semibold text-slate-200 font-mono">{column.min_value ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">MAX</span>
                <span className="font-semibold text-slate-200 font-mono">{column.max_value ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">MEAN</span>
                <span className="font-semibold text-slate-200 font-mono">{column.mean_value ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">MEDIAN</span>
                <span className="font-semibold text-slate-200 font-mono">{column.median_value ?? "N/A"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sample Values */}
        {column.sample_values && column.sample_values.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sample Distinct Values
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {column.sample_values.map((val, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 text-slate-200 font-mono"
                >
                  {val === null || val === "" ? (
                    <span className="text-rose-400 italic">&lt;null&gt;</span>
                  ) : (
                    String(val)
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
