"use client";

import React, { useState } from "react";
import { DatasetSummary, ColumnMeta } from "@/lib/types";
import { handleDatasetMissing } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { FileQuestion, Trash2, Calculator, Check, Loader2, AlertCircle, Sparkles } from "lucide-react";

interface MissingPanelProps {
  summary: DatasetSummary;
  onSuccess: (message: string) => void;
}

export default function MissingPanel({ summary, onSuccess }: MissingPanelProps) {
  const { loadAndSaveDataset } = useDataset();
  const [selectedCol, setSelectedCol] = useState<string>("__all__");
  const [action, setAction] = useState<string>("drop_rows");
  const [customVal, setCustomVal] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingColumns = summary.columns.filter((c) => c.null_count > 0);

  const handleApply = async (col: string, act: string, val?: any) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await handleDatasetMissing(summary.id, {
        column: col,
        action: act,
        custom_value: val !== undefined ? val : customVal,
      });
      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <FileQuestion className="w-4 h-4 text-amber-400" />
            <span>Missing Values Remediation</span>
          </h3>
          <p className="text-xs text-slate-400">
            {summary.missing_cells_count} total missing cells ({summary.missing_cells_percentage}% of dataset)
          </p>
        </div>

        {summary.missing_cells_count > 0 && (
          <button
            onClick={() => handleApply("__all__", "drop_rows")}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Drop All Rows With Any Null</span>
          </button>
        )}
      </div>

      {missingColumns.length === 0 ? (
        <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-1">
          <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>No missing values detected!</span>
          </p>
          <p className="text-[11px] text-slate-400">All cells in all columns contain complete data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {missingColumns.map((col) => {
            const isNum = col.data_type === "Number";

            return (
              <div
                key={col.index}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-indigo-400 font-bold bg-slate-900 px-1 py-0.2 rounded">
                        {col.letter}
                      </span>
                      <h4 className="text-xs font-bold text-slate-100 truncate max-w-[180px]" title={col.name}>
                        {col.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">({col.data_type})</span>
                    </div>
                    <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                      {col.null_count} nulls ({col.null_percentage}%)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-900">
                  <button
                    onClick={() => handleApply(col.name, "drop_rows")}
                    disabled={isSubmitting}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 transition-colors"
                  >
                    Drop Rows
                  </button>

                  {isNum && (
                    <>
                      <button
                        onClick={() => handleApply(col.name, "fill_mean")}
                        disabled={isSubmitting}
                        className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[11px] border border-indigo-500/20 transition-colors"
                        title={`Fill with mean (${col.mean_value})`}
                      >
                        Fill Mean ({col.mean_value})
                      </button>

                      <button
                        onClick={() => handleApply(col.name, "fill_median")}
                        disabled={isSubmitting}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] border border-cyan-500/20 transition-colors"
                        title={`Fill with median (${col.median_value})`}
                      >
                        Fill Median ({col.median_value})
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      const val = prompt(`Enter custom value to fill nulls in '${col.name}':`, isNum ? "0" : "Unknown");
                      if (val !== null) handleApply(col.name, "fill_custom", val);
                    }}
                    disabled={isSubmitting}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 transition-colors"
                  >
                    Custom Fill...
                  </button>
                </div>
              </div>
            );
          })}
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
