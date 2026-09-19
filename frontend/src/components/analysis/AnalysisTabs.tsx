"use client";

import React, { useState } from "react";
import { DatasetSummary } from "@/lib/types";
import StatsPanel from "./StatsPanel";
import GroupByPanel from "./GroupByPanel";
import PivotPanel from "./PivotPanel";
import { Calculator, Layers, Table2, X, Sparkles } from "lucide-react";

interface AnalysisTabsProps {
  summary: DatasetSummary;
  initialTab?: string;
  onClose?: () => void;
}

export default function AnalysisTabs({ summary, initialTab = "stats", onClose }: AnalysisTabsProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);

  const TABS = [
    { id: "stats", label: "Column Statistics", icon: Calculator, desc: "Descriptive metrics (Sum, Avg, Median, Std)" },
    { id: "groupby", label: "Group By Aggregation", icon: Layers, desc: "Segment by categorical dimensions" },
    { id: "pivot", label: "Pivot Table", icon: Table2, desc: "Multi-dimensional matrix cross-tabulation" },
  ];

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/80 shadow-2xl shadow-indigo-950/30 overflow-hidden backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Data Analysis Studio</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 3
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Calculate summary statistics, multi-variable group aggregations, and pivot tables.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close analysis studio"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-slate-800/80 px-4 bg-slate-950/50 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "border-indigo-500 text-indigo-300 bg-indigo-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Body */}
      <div className="p-5">
        {currentTab === "stats" && <StatsPanel summary={summary} />}
        {currentTab === "groupby" && <GroupByPanel summary={summary} />}
        {currentTab === "pivot" && <PivotPanel summary={summary} />}
      </div>
    </div>
  );
}
