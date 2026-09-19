"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PersistedDataset } from "@/lib/types";
import { fetchPersistedDatasets, deletePersistedDataset, fetchDatasetSummary } from "@/lib/api";
import { useDataset } from "@/lib/store";
import { 
  Database, 
  FileSpreadsheet, 
  Trash2, 
  Clock, 
  Layers, 
  ExternalLink,
  HardDrive,
  RefreshCw,
  FolderOpen
} from "lucide-react";

export default function RecentDatasets() {
  const router = useRouter();
  const { setActiveDataset, setIsLoading } = useDataset();
  const [datasets, setDatasets] = useState<PersistedDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await fetchPersistedDatasets();
      setDatasets(data);
    } catch (err) {
      console.error("Failed to load recent datasets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleOpenDataset = async (dataset: PersistedDataset) => {
    setIsLoading(true);
    try {
      // Try to fetch active summary from FastAPI session
      const summary = await fetchDatasetSummary(dataset.id).catch(() => null);
      if (summary) {
        setActiveDataset(summary);
        router.push("/workspace");
      } else {
        // If session expired, inform the user or redirect to re-upload
        alert(`The session for "${dataset.name}" has expired in FastAPI memory. Please re-upload or select a demo dataset.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this dataset record?")) return;
    setDeletingId(id);
    try {
      const success = await deletePersistedDataset(id);
      if (success) {
        setDatasets((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800/80">
        <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mr-2" />
        <span className="text-sm text-slate-400">Loading saved projects from database...</span>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
          <FolderOpen className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-300">No saved datasets found in SQLite</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Upload a CSV/Excel file or try a demo dataset above. Every dataset is automatically tracked in SQLite via Prisma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Recent Datasets (Persisted in SQLite)
          </h3>
        </div>
        <button
          onClick={loadDatasets}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {datasets.map((d) => (
          <div
            key={d.id}
            onClick={() => handleOpenDataset(d)}
            className="group relative p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {d.fileType}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDelete(e, d.id)}
                  disabled={deletingId === d.id}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate" title={d.name}>
                {d.name}
              </h4>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  {d.rowCount.toLocaleString()} rows
                </span>
                <span>•</span>
                <span>{d.columnCount} cols</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{new Date(d.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
