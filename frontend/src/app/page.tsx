"use client";

import React from "react";
import Link from "next/link";
import Dropzone from "@/components/upload/Dropzone";
import DemoSelector from "@/components/upload/DemoSelector";
import RecentDatasets from "@/components/home/RecentDatasets";
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Filter, 
  BarChart3, 
  Table2, 
  Download,
  Zap,
  ShieldCheck,
  Cpu
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>No-Code Data Exploration & Transformation Engine</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Turn Raw Datasets into{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Actionable Intelligence
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Upload any CSV or Excel spreadsheet to instantly clean nulls & duplicates, compute statistics, generate pivot tables, and visualize trends — powered by FastAPI & Pandas.
        </p>
      </div>

      {/* 5-Step Pipeline Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-lg">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
          Core Transformation Pipeline
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Table2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200">1. Upload & Preview</span>
            <span className="text-[10px] text-emerald-400 font-medium">Phase 1 (Live)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1.5 opacity-85">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200">2. Clean Data</span>
            <span className="text-[10px] text-slate-400 font-medium">Phase 2</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1.5 opacity-85">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200">3. Analyze Stats</span>
            <span className="text-[10px] text-slate-400 font-medium">Phase 3</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1.5 opacity-85">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200">4. Visualize</span>
            <span className="text-[10px] text-slate-400 font-medium">Phase 4</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1.5 opacity-85 col-span-2 sm:col-span-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200">5. Export Cleaned</span>
            <span className="text-[10px] text-slate-400 font-medium">Phase 5</span>
          </div>
        </div>
      </div>

      {/* Main Upload & Demo Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Drag & Drop Dropzone */}
        <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100">Upload Dataset File</h2>
              <p className="text-xs text-slate-400 mt-0.5">Parse CSV, XLSX, or XLS files instantly</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Pandas Engine
            </span>
          </div>

          <Dropzone />
        </div>

        {/* Right: Instant Demo Loader */}
        <div className="lg:col-span-5 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl">
          <DemoSelector />
        </div>
      </div>

      {/* Recent Datasets from SQLite */}
      <div className="pt-4">
        <RecentDatasets />
      </div>
    </div>
  );
}
