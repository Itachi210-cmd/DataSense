"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DatasetSummary, ChartRecord } from "@/lib/types";
import { fetchCharts, deleteChart, duplicateChart } from "@/lib/api";
import ChartRenderer from "./ChartRenderer";
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  ScatterChart, 
  Copy, 
  Trash2, 
  Edit3, 
  Plus, 
  AlertTriangle,
  RefreshCw,
  Sparkles
} from "lucide-react";

interface SavedChartsListProps {
  summary: DatasetSummary;
  onEdit?: (chart: ChartRecord) => void;
}

export default function SavedChartsList({ summary, onEdit }: SavedChartsListProps) {
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCharts(summary.id);
      setCharts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load charts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharts();
  }, [summary.id]);

  const handleDelete = async (chartId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete chart '${title}'?`)) return;
    try {
      await deleteChart(summary.id, chartId);
      setCharts(charts.filter((c) => c.id !== chartId));
    } catch (err: any) {
      alert("Failed to delete chart: " + err.message);
    }
  };

  const handleDuplicate = async (chartId: string) => {
    try {
      const cloned = await duplicateChart(summary.id, chartId);
      setCharts([...charts, cloned]);
    } catch (err: any) {
      alert("Failed to duplicate chart: " + err.message);
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case "line": return LineChart;
      case "pie": return PieChart;
      case "scatter": return ScatterChart;
      default: return BarChart3;
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        <span>Loading saved charts...</span>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 max-w-xl mx-auto my-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">No Charts Saved Yet</h3>
          <p className="text-xs text-slate-400">
            Create and customize Bar, Line, Pie, or Scatter charts for '{summary.name}'.
          </p>
        </div>
        <Link
          href="/workspace/charts/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Chart</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Saved Visualizations
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {charts.length} chart{charts.length === 1 ? "" : "s"}
          </span>
        </div>

        <Link
          href="/workspace/charts/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chart</span>
        </Link>
      </div>

      {/* Grid of Chart Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => {
          const Icon = getChartIcon(chart.type);
          const isValid = chart.data_payload?.is_valid ?? true;

          return (
            <div
              key={chart.id}
              className={`rounded-2xl border bg-slate-950/80 p-5 shadow-xl transition-all space-y-3.5 ${
                isValid
                  ? "border-slate-800/80 hover:border-slate-700"
                  : "border-amber-500/40 bg-amber-500/5"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate" title={chart.title}>
                      {chart.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {chart.config.x_column} {chart.config.y_column ? `• ${chart.config.y_column} (${chart.config.aggregation?.toUpperCase()})` : ""}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDuplicate(chart.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Duplicate chart"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(chart.id, chart.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete chart"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Warning Alert if Column Missing */}
              {!isValid && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Column(s) missing from dataset. Please update configuration.</span>
                </div>
              )}

              {/* Chart Renderer Viewport */}
              <div className="pt-1">
                {chart.data_payload ? (
                  <ChartRenderer config={chart.config} payload={chart.data_payload} height={260} />
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-slate-500 text-xs">
                    No data payload
                  </div>
                )}
              </div>

              {/* Card Footer info */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span className="capitalize">{chart.type} Chart</span>
                <span>Points: {chart.data_payload?.total_points || 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
