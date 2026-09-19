"use client";

import React, { useState } from "react";
import { DatasetSummary } from "@/lib/types";
import { resetDataset } from "@/lib/api";
import { useDataset } from "@/lib/store";
import FilterPanel from "./FilterPanel";
import SortPanel from "./SortPanel";
import MissingPanel from "./MissingPanel";
import DuplicatePanel from "./DuplicatePanel";
import EditDataPanel from "./EditDataPanel";
import DataTypePanel from "./DataTypePanel";
import { 
  Filter, 
  ArrowUpDown, 
  FileQuestion, 
  CopyCheck, 
  FileEdit, 
  Binary, 
  RotateCcw, 
  CheckCircle2, 
  X,
  Sparkles
} from "lucide-react";

interface CleaningTabsProps {
  summary: DatasetSummary;
  initialTab?: string;
  onClose?: () => void;
}

export default function CleaningTabs({ summary, initialTab = "filter", onClose }: CleaningTabsProps) {
  const { loadAndSaveDataset } = useDataset();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleSuccess = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  const handleReset = async () => {
    if (!confirm(`Revert dataset '${summary.name}' back to its original uploaded state? All cleaning steps will be undone.`)) return;
    setIsResetting(true);
    try {
      const res = await resetDataset(summary.id);
      await loadAndSaveDataset(res.summary);
      handleSuccess(res.message);
    } catch (e: any) {
      alert(e.message || "Failed to reset dataset.");
    } finally {
      setIsResetting(false);
    }
  };

  const tabs = [
    { id: "filter", label: "Filter", icon: Filter, count: null },
    { id: "sort", label: "Sort", icon: ArrowUpDown, count: null },
    { id: "missing", label: "Missing Values", icon: FileQuestion, count: summary.missing_cells_count },
    { id: "duplicates", label: "Duplicates", icon: CopyCheck, count: summary.duplicate_rows_count },
    { id: "edit", label: "Edit Structure", icon: FileEdit, count: null },
    { id: "types", label: "Data Types", icon: Binary, count: null },
  ];

  return (
    <div className="space-y-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Data Cleaning Toolkit</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Phase 2 Active
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/70 flex items-center gap-1.5 transition-colors"
            title="Revert to original raw upload"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? "animate-spin" : ""}`} />
            <span>Revert to Raw</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Close cleaning panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-indigo-800 text-indigo-200" : "bg-rose-500/20 text-rose-300"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live Feedback Message */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{feedback}</span>
          <span className="text-[11px] text-emerald-400/80 ml-auto font-mono">Cleaned state auto-saved to disk</span>
        </div>
      )}

      {/* Active Tab Panel */}
      <div>
        {activeTab === "filter" && <FilterPanel summary={summary} onSuccess={handleSuccess} />}
        {activeTab === "sort" && <SortPanel summary={summary} onSuccess={handleSuccess} />}
        {activeTab === "missing" && <MissingPanel summary={summary} onSuccess={handleSuccess} />}
        {activeTab === "duplicates" && <DuplicatePanel summary={summary} onSuccess={handleSuccess} />}
        {activeTab === "edit" && <EditDataPanel summary={summary} onSuccess={handleSuccess} />}
        {activeTab === "types" && <DataTypePanel summary={summary} onSuccess={handleSuccess} />}
      </div>
    </div>
  );
}
