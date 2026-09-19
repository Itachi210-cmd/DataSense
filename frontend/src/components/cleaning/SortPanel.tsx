"use client";

import React, { useState } from "react";
import { DatasetSummary } from "@/lib/types";
import { applyDatasetSort } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { ArrowUpDown, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface SortPanelProps {
  summary: DatasetSummary;
  onSuccess: (message: string) => void;
}

export default function SortPanel({ summary, onSuccess }: SortPanelProps) {
  const { loadAndSaveDataset } = useDataset();
  const [sorts, setSorts] = useState<Array<{ column: string; direction: "asc" | "desc" }>>([
    { column: summary.columns[0]?.name || "", direction: "asc" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSort = () => {
    setSorts((prev) => [
      ...prev,
      { column: summary.columns[0]?.name || "", direction: "asc" },
    ]);
  };

  const removeSort = (idx: number) => {
    setSorts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSort = (idx: number, field: string, val: any) => {
    setSorts((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  };

  const handleApply = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await applyDatasetSort(summary.id, { sorts });
      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to apply sort.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-indigo-400" />
            <span>Sort Data</span>
          </h3>
          <p className="text-xs text-slate-400">Order dataset rows by one or more columns</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {sorts.map((sort, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-500 font-mono w-6">#{idx + 1}</span>
            <select
              value={sort.column}
              onChange={(e) => updateSort(idx, "column", e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-indigo-500"
            >
              {summary.columns.map((c) => (
                <option key={c.index} value={c.name}>
                  {c.letter} • {c.name} ({c.data_type})
                </option>
              ))}
            </select>

            <select
              value={sort.direction}
              onChange={(e) => updateSort(idx, "direction", e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 w-36 focus:outline-none focus:border-indigo-500"
            >
              <option value="asc">Ascending (A-Z, 0-9)</option>
              <option value="desc">Descending (Z-A, 9-0)</option>
            </select>

            {sorts.length > 1 && (
              <button
                type="button"
                onClick={() => removeSort(idx)}
                className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addSort}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Sort Column</span>
        </button>

        <button
          type="button"
          onClick={handleApply}
          disabled={isSubmitting}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
        >
          {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Apply Sorting</span>
        </button>
      </div>
    </div>
  );
}
