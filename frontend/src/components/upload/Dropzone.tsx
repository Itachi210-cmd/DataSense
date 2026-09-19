"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadDatasetFile } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  FileCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function Dropzone() {
  const router = useRouter();
  const { loadAndSaveDataset } = useDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successState, setSuccessState] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = [".csv", ".xlsx", ".xls", ".txt"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage(`Invalid file format "${fileExt}". Please upload a CSV, XLSX, or XLS file.`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("File size exceeds 50MB limit.");
      return;
    }

    setSelectedFile(file);
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      setUploadProgress(50);
      const summary = await uploadDatasetFile(file);
      setUploadProgress(85);

      // Persist to Prisma SQLite DB and update React store
      await loadAndSaveDataset(summary);
      setUploadProgress(100);
      setSuccessState(true);

      setTimeout(() => {
        router.push("/workspace");
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while processing the dataset.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
            : "border-slate-700/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-600"
        } ${isUploading ? "pointer-events-none" : ""}`}
      >
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            ) : successState ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400/20 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
          </div>
        </div>

        <div className="text-center space-y-1.5 max-w-md">
          <h3 className="text-base sm:text-lg font-semibold text-slate-100">
            {isUploading
              ? "Parsing & Analyzing Dataset..."
              : successState
              ? "Dataset Loaded! Redirecting..."
              : "Drag & drop your dataset here"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Supports <span className="font-semibold text-slate-300">CSV</span>,{" "}
            <span className="font-semibold text-slate-300">XLSX</span>, and{" "}
            <span className="font-semibold text-slate-300">XLS</span> files up to 50MB
          </p>
        </div>

        {!isUploading && (
          <button
            type="button"
            className="mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-medium text-slate-200 transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Browse Files</span>
          </button>
        )}

        {/* Progress Bar */}
        {isUploading && (
          <div className="w-full max-w-xs mt-6 space-y-2">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Extracting columns & rows</span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
