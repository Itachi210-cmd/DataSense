"use client";

import React, { useState } from "react";
import { DatasetSummary, DataType } from "@/lib/types";
import { convertDatasetDataType } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { Binary, Hash, Calendar, Type, Check, Loader2, AlertCircle } from "lucide-react";

interface DataTypePanelProps {
  summary: DatasetSummary;
  onSuccess: (message: string) => void;
}

export default function DataTypePanel({ summary, onSuccess }: DataTypePanelProps) {
  const { loadAndSaveDataset } = useDataset();
  const [selectedCol, setSelectedCol] = useState(summary.columns[0]?.name || "");
  const [targetType, setTargetType] = useState<DataType>("Text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCol = summary.columns.find((c) => c.name === selectedCol);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await convertDatasetDataType(summary.id, {
        column_name: selectedCol,
        target_type: targetType,
      });
      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to convert data type.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Binary className="w-4 h-4 text-purple-400" />
          <span>Convert Column Data Types</span>
        </h3>
        <p className="text-xs text-slate-400">Cast column format to ensure proper statistics and visualization</p>
      </div>

      <form onSubmit={handleConvert} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Select Column</label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {summary.columns.map((c) => (
                <option key={c.index} value={c.name}>
                  {c.letter} • {c.name} (Current: {c.data_type})
                </option>
              ))}
            </select>
            {currentCol && (
              <span className="text-[10px] text-slate-500 mt-1 block">
                Current native dtype: <code className="text-slate-400">{currentCol.original_dtype}</code>
              </span>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Target Data Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "Text", icon: Type, color: "text-blue-400" },
                { type: "Number", icon: Hash, color: "text-emerald-400" },
                { type: "Date", icon: Calendar, color: "text-purple-400" },
                { type: "Boolean", icon: Binary, color: "text-amber-400" },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = targetType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setTargetType(item.type as DataType)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span>{item.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Convert Column to {targetType}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
