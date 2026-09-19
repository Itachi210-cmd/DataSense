"use client";

import React, { useState } from "react";
import { DatasetSummary } from "@/lib/types";
import { applyDatasetFilter } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { Filter, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface FilterPanelProps {
  summary: DatasetSummary;
  onSuccess: (message: string) => void;
}

export default function FilterPanel({ summary, onSuccess }: FilterPanelProps) {
  const { loadAndSaveDataset } = useDataset();
  const [conditions, setConditions] = useState<Array<{ column: string; operator: string; value: string; value2: string }>>([
    { column: summary.columns[0]?.name || "", operator: "equals", value: "", value2: "" },
  ]);
  const [matchType, setMatchType] = useState<"all" | "any">("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { column: summary.columns[0]?.name || "", operator: "equals", value: "", value2: "" },
    ]);
  };

  const removeCondition = (idx: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: string, val: string) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );
  };

  const handleApply = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const validConditions = conditions.filter((c) => c.column && (c.operator === "is_null" || c.operator === "is_not_null" || c.value !== ""));
      if (validConditions.length === 0) {
        throw new Error("Please specify at least one valid filter condition with a value.");
      }

      const res = await applyDatasetFilter(summary.id, {
        conditions: validConditions,
        match_type: matchType,
      });

      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to apply filter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Filter Rows</span>
          </h3>
          <p className="text-xs text-slate-400">Keep rows matching your criteria</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400">Match:</span>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as "all" | "any")}
            className="bg-transparent text-indigo-400 font-semibold focus:outline-none"
          >
            <option value="all" className="bg-slate-900 text-slate-200">All (AND)</option>
            <option value="any" className="bg-slate-900 text-slate-200">Any (OR)</option>
          </select>
        </div>
      </div>

      {/* Conditions list */}
      <div className="space-y-2.5">
        {conditions.map((cond, idx) => (
          <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            {/* Column select */}
            <select
              value={cond.column}
              onChange={(e) => updateCondition(idx, "column", e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 w-full sm:w-44 focus:outline-none focus:border-indigo-500"
            >
              {summary.columns.map((c) => (
                <option key={c.index} value={c.name}>
                  {c.letter} • {c.name} ({c.data_type})
                </option>
              ))}
            </select>

            {/* Operator select */}
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(idx, "operator", e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 w-full sm:w-36 focus:outline-none focus:border-indigo-500"
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="not_contains">Does not contain</option>
              <option value="starts_with">Starts with</option>
              <option value="ends_with">Ends with</option>
              <option value="gt">&gt; Greater than</option>
              <option value="gte">&gt;= Greater or eq</option>
              <option value="lt">&lt; Less than</option>
              <option value="lte">&lt;= Less or eq</option>
              <option value="between">Between</option>
              <option value="is_null">Is Empty / Null</option>
              <option value="is_not_null">Is Not Empty</option>
            </select>

            {/* Value inputs */}
            {cond.operator !== "is_null" && cond.operator !== "is_not_null" && (
              <input
                type="text"
                placeholder="Value..."
                value={cond.value}
                onChange={(e) => updateCondition(idx, "value", e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-indigo-500 min-w-[120px]"
              />
            )}

            {cond.operator === "between" && (
              <input
                type="text"
                placeholder="Upper value..."
                value={cond.value2}
                onChange={(e) => updateCondition(idx, "value2", e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-indigo-500 min-w-[120px]"
              />
            )}

            {conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeCondition(idx)}
                className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                title="Remove condition"
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
          onClick={addCondition}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Rule</span>
        </button>

        <button
          type="button"
          onClick={handleApply}
          disabled={isSubmitting}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
        >
          {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Apply Filter</span>
        </button>
      </div>
    </div>
  );
}
