"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDataset } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import AnalysisTabs from "@/components/analysis/AnalysisTabs";
import { FileSpreadsheet, Upload, ArrowLeft } from "lucide-react";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const { activeDataset } = useDataset();
  const tab = searchParams.get("tab") || "stats";

  return (
    <div className="flex-1 flex flex-row min-h-[calc(100vh-57px)]">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {!activeDataset ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 rounded-2xl bg-slate-900/30 border border-slate-800/60 max-w-xl mx-auto my-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">
                No Dataset Loaded in Session
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Please upload a CSV or Excel file or load a demo dataset to perform data analysis.
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
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <Link
                  href="/workspace"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                  title="Back to Preview & Data Table"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Phase 3 • Data Analysis Studio
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {activeDataset.name}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Statistical Analysis, Group By & Pivot
                  </h1>
                </div>
              </div>
            </div>

            {/* Analysis Tool Component */}
            <AnalysisTabs summary={activeDataset} initialTab={tab} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading analysis studio...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
