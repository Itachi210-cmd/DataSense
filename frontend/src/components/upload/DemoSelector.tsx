"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SampleDatasetInfo } from "@/lib/types";
import { fetchSampleDatasets, loadSampleDataset } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { 
  Sparkles, 
  ShoppingBag, 
  AlertTriangle, 
  Loader2, 
  ArrowRight,
  Layers,
  Columns
} from "lucide-react";

export default function DemoSelector() {
  const router = useRouter();
  const { loadAndSaveDataset } = useDataset();
  const [samples, setSamples] = useState<SampleDatasetInfo[]>([]);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSampleDatasets()
      .then(setSamples)
      .catch((err) => {
        console.warn("Could not fetch samples from FastAPI", err);
      });
  }, []);

  const handleLoadSample = async (sampleId: string) => {
    setLoadingSampleId(sampleId);
    setError(null);
    try {
      const summary = await loadSampleDataset(sampleId);
      await loadAndSaveDataset(summary);
      router.push("/workspace");
    } catch (err: any) {
      setError(err.message || "Failed to load sample dataset");
      setLoadingSampleId(null);
    }
  };

  if (samples.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300">
          Try with Demo Datasets (Instant 1-Click Load)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {samples.map((s) => {
          const isMessy = s.id.includes("messy");
          const isLoading = loadingSampleId === s.id;

          return (
            <div
              key={s.id}
              onClick={() => !loadingSampleId && handleLoadSample(s.id)}
              className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isMessy
                  ? "bg-gradient-to-br from-amber-500/5 via-slate-900/60 to-slate-900 border-amber-500/20 hover:border-amber-500/40"
                  : "bg-gradient-to-br from-indigo-500/5 via-slate-900/60 to-slate-900 border-indigo-500/20 hover:border-indigo-500/40"
              } hover:shadow-lg hover:shadow-indigo-500/10`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg border ${
                        isMessy
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}
                    >
                      {isMessy ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {s.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 uppercase font-mono">
                        .{s.file_type}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      isMessy
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}
                  >
                    {isMessy ? "Messy Demo" : "Clean Demo"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {s.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    {s.row_count.toLocaleString()} rows
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Columns className="w-3.5 h-3.5 text-cyan-400" />
                    {s.column_count} columns
                  </span>
                </div>

                <button
                  type="button"
                  disabled={Boolean(loadingSampleId)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-cyan-300 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Load Demo</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-rose-400 mt-2">
          Error: {error}
        </p>
      )}
    </div>
  );
}
