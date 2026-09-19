"use client";

import React, { useState } from "react";
import { DatasetSummary } from "@/lib/types";
import { 
  renameDatasetColumn, 
  addDatasetColumn, 
  deleteDatasetColumn, 
  deleteDatasetRow 
} from "@/lib/api";
import { useDataset } from "@/lib/store";
import { FileEdit, Plus, Trash2, Edit3, Loader2, AlertCircle } from "lucide-react";

interface EditDataPanelProps {
  summary: DatasetSummary;
  onSuccess: (message: string) => void;
}

export default function EditDataPanel({ summary, onSuccess }: EditDataPanelProps) {
  const { loadAndSaveDataset } = useDataset();
  const [activeAction, setActiveAction] = useState<"rename" | "add_col" | "del_col" | "del_row">("rename");
  
  // Forms
  const [oldCol, setOldCol] = useState(summary.columns[0]?.name || "");
  const [newColName, setNewColName] = useState("");
  
  const [addColName, setAddColName] = useState("");
  const [addColDefault, setAddColDefault] = useState("");
  const [addColType, setAddColType] = useState("Text");
  
  const [delColName, setDelColName] = useState(summary.columns[0]?.name || "");
  const [delRowIndex, setDelRowIndex] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await renameDatasetColumn(summary.id, {
        old_name: oldCol,
        new_name: newColName.trim(),
      });
      await loadAndSaveDataset(res.summary);
      setNewColName("");
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to rename column.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addColName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await addDatasetColumn(summary.id, {
        column_name: addColName.trim(),
        default_value: addColDefault,
        data_type: addColType,
      });
      await loadAndSaveDataset(res.summary);
      setAddColName("");
      setAddColDefault("");
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to add column.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Are you sure you want to delete column '${delColName}'? This action cannot be undone.`)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await deleteDatasetColumn(summary.id, { column_name: delColName });
      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to delete column.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Delete row #${delRowIndex}?`)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await deleteDatasetRow(summary.id, { row_index: Number(delRowIndex) });
      await loadAndSaveDataset(res.summary);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to delete row.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-cyan-400" />
            <span>Edit Dataset Structure</span>
          </h3>
          <p className="text-xs text-slate-400">Add, delete, or rename columns and rows</p>
        </div>

        {/* Action Toggle Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveAction("rename"); setError(null); }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeAction === "rename" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Rename Column
          </button>
          <button
            onClick={() => { setActiveAction("add_col"); setError(null); }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeAction === "add_col" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Add Column
          </button>
          <button
            onClick={() => { setActiveAction("del_col"); setError(null); }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeAction === "del_col" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Delete Column
          </button>
          <button
            onClick={() => { setActiveAction("del_row"); setError(null); }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeAction === "del_row" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Delete Row
          </button>
        </div>
      </div>

      {/* Forms */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
        {activeAction === "rename" && (
          <form onSubmit={handleRename} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="w-full sm:w-1/3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Target Column</label>
              <select
                value={oldCol}
                onChange={(e) => setOldCol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {summary.columns.map((c) => (
                  <option key={c.index} value={c.name}>{c.letter} • {c.name}</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">New Column Name</label>
              <input
                type="text"
                placeholder="e.g. Total Revenue ($)"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newColName.trim()}
              className="mt-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>Rename</span>
            </button>
          </form>
        )}

        {activeAction === "add_col" && (
          <form onSubmit={handleAddColumn} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="w-full sm:w-1/3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Column Name</label>
              <input
                type="text"
                placeholder="e.g. Status"
                value={addColName}
                onChange={(e) => setAddColName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="w-full sm:w-1/4">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Type</label>
              <select
                value={addColType}
                onChange={(e) => setAddColType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Text">Text</option>
                <option value="Number">Number</option>
                <option value="Boolean">Boolean</option>
              </select>
            </div>

            <div className="w-full sm:w-1/3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Default Value</label>
              <input
                type="text"
                placeholder="Initial value for all rows"
                value={addColDefault}
                onChange={(e) => setAddColDefault(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !addColName.trim()}
              className="mt-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Column</span>
            </button>
          </form>
        )}

        {activeAction === "del_col" && (
          <form onSubmit={handleDeleteColumn} className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Select Column to Delete</label>
              <select
                value={delColName}
                onChange={(e) => setDelColName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {summary.columns.map((c) => (
                  <option key={c.index} value={c.name}>{c.letter} • {c.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete Column</span>
            </button>
          </form>
        )}

        {activeAction === "del_row" && (
          <form onSubmit={handleDeleteRow} className="flex items-center gap-3">
            <div className="w-48">
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Row Number (#)</label>
              <input
                type="number"
                min={1}
                max={summary.row_count}
                value={delRowIndex}
                onChange={(e) => setDelRowIndex(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete Row #{delRowIndex}</span>
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
