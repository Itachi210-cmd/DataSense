"use client";

import React, { useState } from "react";
import { DatasetSummary } from "@/lib/types";
import { handleDatasetDuplicates } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { CopyCheck, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface DuplicatePanelProps {
  summary: DatasetSummary;
  onSuccess: (message: string) => void;
}

export default function DuplicatePanel({ summary, onSuccess }: DuplicatePanelProps) {
  const { loadAndSaveDataset } = useDataset();
  const [keep, setKeep] = useState<"first" | "last">("first");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await handleDatasetDuplicates(summary.id, {
        subset_columns: undefined,
        keep: keep,
      });
      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to remove duplicates.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <CopyCheck className="w-4 h-4 text-rose-400" />
            <span>Duplicate Rows Detection</span>
          </h3>
          <p className="text-xs text-slate-400">Detect and remove identical records</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            summary.duplicate_rows_count > 0
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            {summary.duplicate_rows_count} Duplicates Found
          </span>
        </div>
      </div>

      {summary.duplicate_rows_count === 0 ? (
        <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-1">
          <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Clean dataset: No duplicate rows detected!</span>
          </p>
          <p className="text-[11px] text-slate-400">All {summary.row_count} rows are distinct.</p>
        </div>
      ) : (
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <p className="text-xs text-slate-300">
            DataSense detected <strong className="text-rose-400">{summary.duplicate_rows_count} duplicate rows</strong> in this dataset. Removing duplicates will clean redundancy while keeping one copy of each record.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Keep occurrence:</span>
              <select
                value={keep}
                onChange={(e) => setKeep(e.target.value as "first" | "last")}
                className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="first">Keep First Occurrence</option>
                <option value="last">Keep Last Occurrence</option>
              </select>
            </div>

            <button
              onClick={handleRemove}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Remove {summary.duplicate_rows_count} Duplicates</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
