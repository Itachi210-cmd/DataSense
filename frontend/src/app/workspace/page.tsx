"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDataset } from "@/lib/store";
import { getExportUrl, resetDataset } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import SummaryCards from "@/components/preview/SummaryCards";
import DataTable from "@/components/preview/DataTable";
import CleaningTabs from "@/components/cleaning/CleaningTabs";
import AnalysisTabs from "@/components/analysis/AnalysisTabs";
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Sparkles, 
  Filter, 
  Calculator, 
  RotateCcw,
  CheckCircle2
} from "lucide-react";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const { activeDataset, loadAndSaveDataset } = useDataset();
  const [showCleaning, setShowCleaning] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState("filter");
  const [analysisTab, setAnalysisTab] = useState("stats");
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Check if query parameter specifies a cleaning or analysis tab
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      if (["stats", "groupby", "pivot"].includes(tab)) {
        setAnalysisTab(tab);
        setShowAnalysis(true);
        setShowCleaning(false);
      } else {
        setActiveTab(tab);
        setShowCleaning(true);
        setShowAnalysis(false);
      }
    }
  }, [searchParams]);


  const handleReset = async () => {
    if (!activeDataset) return;
    if (!confirm(`Revert dataset '${activeDataset.name}' back to its original uploaded state? All cleaning operations will be undone.`)) return;

    setIsResetting(true);
    try {
      const res = await resetDataset(activeDataset.id);
      await loadAndSaveDataset(res.summary);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 5000);
    } catch (e: any) {
      alert(e.message || "Failed to reset dataset.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-row min-h-[calc(100vh-57px)]">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {!activeDataset ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 rounded-2xl bg-slate-900/30 border border-slate-800/60 max-w-xl mx-auto my-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">
                No Dataset Loaded in Session
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Please upload a CSV or Excel file or load a demo dataset to preview and clean data.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Dataset</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <span>Choose Demo</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Dataset Loaded View */
          <div className="space-y-6">
            {/* Top Workspace Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Phase 3 Active • Data Analysis
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-medium">
                    {activeDataset.columns.length} columns • {activeDataset.row_count.toLocaleString()} rows
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    On-Disk Persistence Online
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{activeDataset.name}</span>
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/70 transition-colors"
                  title="Revert to original uploaded file"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? "animate-spin" : ""}`} />
                  <span>Revert to Raw</span>
                </button>

                <a
                  href={getExportUrl(activeDataset.id)}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  title="Download current data as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </a>

                <button
                  onClick={() => {
                    setShowCleaning(!showCleaning);
                    if (!showCleaning) setShowAnalysis(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
                    showCleaning
                      ? "bg-slate-800 text-slate-200 border border-slate-700"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{showCleaning ? "Hide Cleaning" : "Clean Data"}</span>
                </button>

                <button
                  onClick={() => {
                    setShowAnalysis(!showAnalysis);
                    if (!showAnalysis) setShowCleaning(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
                    showAnalysis
                      ? "bg-purple-600 text-white shadow-purple-600/25"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 text-purple-200" />
                  <span>{showAnalysis ? "Hide Analysis" : "Analyze Data"}</span>
                  <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded font-mono text-purple-200">Phase 3</span>
                </button>
              </div>
            </div>

            {/* Live Feedback Banner */}
            {feedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Analysis Toolkit Panel */}
            {showAnalysis && (
              <AnalysisTabs
                summary={activeDataset}
                initialTab={analysisTab}
                onClose={() => setShowAnalysis(false)}
              />
            )}

            {/* Cleaning Toolkit Panel */}
            {showCleaning && (
              <CleaningTabs
                summary={activeDataset}
                initialTab={activeTab}
                onClose={() => setShowCleaning(false)}
              />
            )}


            {/* Summary Stat Cards */}
            <SummaryCards summary={activeDataset} />

            {/* Interactive Spreadsheet Data Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Spreadsheet Data Grid
                </h2>
                <span className="text-xs text-slate-400">
                  Tip: Double-click any cell to edit inline • Press Enter to save
                </span>
              </div>
              <DataTable summary={activeDataset} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading workspace...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
