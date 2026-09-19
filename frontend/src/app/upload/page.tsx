"use client";

import React from "react";
import Link from "next/link";
import Dropzone from "@/components/upload/Dropzone";
import DemoSelector from "@/components/upload/DemoSelector";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Upload Dataset
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Upload a spreadsheet or load a demo dataset to start cleaning, statistical exploration, and visualization.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div className="bg-slate-900/50 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl">
        <Dropzone />
      </div>

      {/* Demo Selector */}
      <div className="pt-4">
        <DemoSelector />
      </div>
    </div>
  );
}
