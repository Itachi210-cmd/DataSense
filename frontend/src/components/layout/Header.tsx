"use client";

import React from "react";
import Link from "next/link";
import { useDataset } from "@/lib/store";
import { 
  Database, 
  Upload, 
  Sparkles, 
  FileSpreadsheet, 
  HardDrive, 
  Layers,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function Header() {
  const { activeDataset } = useDataset();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand / Logo & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  DataSense
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v1.0
                </span>
              </div>
            </div>
          </Link>

          {activeDataset && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-sm">
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span className="font-medium text-slate-200 truncate max-w-[220px]" title={activeDataset.name}>
                  {activeDataset.name}
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>{activeDataset.row_count.toLocaleString()} rows</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  <span>{activeDataset.memory_usage_formatted}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeDataset ? (
            <>
              <Link
                href="/workspace"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/50 transition-colors"
              >
                <span>Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/30"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Switch Dataset</span>
              </Link>
            </>
          ) : (
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:opacity-95 text-white shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dataset</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
