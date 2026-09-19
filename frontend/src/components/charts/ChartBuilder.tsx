"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DatasetSummary, ChartConfig, ChartDataPayload, ChartRecord } from "@/lib/types";
import { previewChart, createChart, updateChart } from "@/lib/api";
import ChartRenderer from "./ChartRenderer";
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  ScatterChart, 
  Sparkles, 
  Play, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Palette,
  Sliders,
  Layers
} from "lucide-react";

interface ChartBuilderProps {
  summary: DatasetSummary;
  initialChart?: ChartRecord;
  onSaved?: (chart: ChartRecord) => void;
}

const CHART_TYPES = [
  { id: "bar", label: "Bar Chart", icon: BarChart3, desc: "Compare categorical metrics & distributions" },
  { id: "line", label: "Line Chart", icon: LineChart, desc: "Analyze trends over dates or ordered sequences" },
  { id: "pie", label: "Pie Chart", icon: PieChart, desc: "Proportional breakdown of parts to a whole" },
  { id: "scatter", label: "Scatter Plot", icon: ScatterChart, desc: "Correlation between two continuous variables" },
];

const COLOR_PALETTES = [
  { id: "indigo", label: "Indigo", color: "bg-indigo-500" },
  { id: "emerald", label: "Emerald", color: "bg-emerald-500" },
  { id: "cyan", label: "Cyan", color: "bg-cyan-500" },
  { id: "purple", label: "Purple", color: "bg-purple-500" },
  { id: "amber", label: "Amber", color: "bg-amber-500" },
  { id: "rose", label: "Rose", color: "bg-rose-500" },
];

export default function ChartBuilder({ summary, initialChart, onSaved }: ChartBuilderProps) {
  const router = useRouter();
  const numericColumns = summary.columns.filter((c) => c.data_type === "Number");
  const categoricalColumns = summary.columns.filter((c) => c.data_type !== "Number");
  const allColumns = summary.columns;

  const defaultX = categoricalColumns[0]?.name || allColumns[0]?.name || "";
  const defaultY = numericColumns[0]?.name || allColumns[1]?.name || allColumns[0]?.name || "";

  // State
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "scatter">(
    (initialChart?.config.type as any) || "bar"
  );
  const [title, setTitle] = useState(initialChart?.config.title || "New Visualization");
  const [xColumn, setXColumn] = useState(initialChart?.config.x_column || defaultX);
  const [yColumn, setYColumn] = useState<string>(initialChart?.config.y_column || defaultY);
  const [aggregation, setAggregation] = useState<string>(initialChart?.config.aggregation || "sum");
  const [maxCategories, setMaxCategories] = useState<number>(initialChart?.config.max_categories || 15);
  const [includeOther, setIncludeOther] = useState<boolean>(initialChart?.config.include_other ?? true);
  const [colorPalette, setColorPalette] = useState<any>(initialChart?.config.color_palette || "indigo");
  const [showLegend, setShowLegend] = useState<boolean>(initialChart?.config.show_legend ?? true);
  const [showGrid, setShowGrid] = useState<boolean>(initialChart?.config.show_grid ?? true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPayload, setPreviewPayload] = useState<ChartDataPayload | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Re-run live preview on configuration changes
  const runPreview = async () => {
    if (!xColumn) return;
    setLoading(true);
    setError(null);

    const config: ChartConfig = {
      title,
      type: chartType,
      x_column: xColumn,
      y_column: chartType === "pie" && aggregation === "count" ? null : yColumn,
      aggregation: chartType === "scatter" ? "none" : (aggregation as any),
      max_categories: Number(maxCategories),
      include_other: includeOther,
      color_palette: colorPalette,
      show_legend: showLegend,
      show_grid: showGrid,
    };

    try {
      const payload = await previewChart(summary.id, config);
      setPreviewPayload(payload);
    } catch (err: any) {
      setError(err.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPreview();
  }, [chartType, xColumn, yColumn, aggregation, maxCategories, includeOther, colorPalette, showLegend, showGrid, summary.id]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please provide a chart title.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let savedRecord: ChartRecord;
      if (initialChart) {
        savedRecord = await updateChart(summary.id, initialChart.id, {
          title,
          type: chartType,
          x_column: xColumn,
          y_column: chartType === "pie" && aggregation === "count" ? null : yColumn,
          aggregation,
          max_categories: maxCategories,
          include_other: includeOther,
          color_palette: colorPalette,
          show_legend: showLegend,
          show_grid: showGrid,
        });
      } else {
        savedRecord = await createChart(summary.id, {
          title,
          type: chartType,
          x_column: xColumn,
          y_column: chartType === "pie" && aggregation === "count" ? null : yColumn,
          aggregation: chartType === "scatter" ? "none" : (aggregation as any),
          max_categories: maxCategories,
          include_other: includeOther,
          color_palette: colorPalette,
          show_legend: showLegend,
          show_grid: showGrid,
        });
      }

      setFeedback(`Chart '${savedRecord.title}' saved successfully to My Charts library.`);
      if (onSaved) {
        onSaved(savedRecord);
      } else {
        setTimeout(() => {
          router.push("/workspace/charts");
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save chart");
    } finally {
      setSaving(false);
    }
  };

  const activeConfig: ChartConfig = {
    title,
    type: chartType,
    x_column: xColumn,
    y_column: yColumn,
    aggregation: aggregation as any,
    max_categories: maxCategories,
    include_other: includeOther,
    color_palette: colorPalette,
    show_legend: showLegend,
    show_grid: showGrid,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Configuration Column (Left) */}
      <div className="lg:col-span-5 space-y-5">
        {/* Step 1: Chart Type */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">1</span>
            <span>Select Chart Type</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CHART_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = chartType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setChartType(t.id as any);
                    if (t.id === "scatter" && categoricalColumns.some(c => c.name === xColumn)) {
                      setXColumn(numericColumns[0]?.name || xColumn);
                    }
                  }}
                  className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/50 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{t.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Data Mapping */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">2</span>
            <span>Map Data Dimensions</span>
          </label>

          {/* X Axis */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>{chartType === "scatter" ? "X-Axis (Continuous Numeric)" : "Category / X-Axis"}</span>
            </label>
            <select
              value={xColumn}
              onChange={(e) => setXColumn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {chartType === "scatter" ? (
                <optgroup label="Numeric Columns Only">
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} (Number)</option>
                  ))}
                </optgroup>
              ) : (
                <>
                  <optgroup label="Categorical Dimensions">
                    {categoricalColumns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name} ({c.data_type})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Numeric Columns">
                    {numericColumns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name} (Number)</option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* Y Axis (if applicable) */}
          {(chartType !== "pie" || aggregation !== "count") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>{chartType === "scatter" ? "Y-Axis (Continuous Numeric)" : "Metric / Y-Axis"}</span>
              </label>
              <select
                value={yColumn}
                onChange={(e) => setYColumn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <optgroup label="Numeric Columns (Required for Metric)">
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} (Number)</option>
                  ))}
                </optgroup>
                {chartType !== "scatter" && (
                  <optgroup label="Other Columns">
                    {categoricalColumns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name} ({c.data_type})</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* Aggregation (Not for scatter) */}
          {chartType !== "scatter" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Aggregation Method</label>
              <div className="grid grid-cols-5 gap-1">
                {(["sum", "avg", "count", "min", "max"] as const).map((agg) => (
                  <button
                    key={agg}
                    type="button"
                    onClick={() => setAggregation(agg)}
                    className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      aggregation === agg
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {agg}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Configure Appearance */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">3</span>
            <span>Appearance & Tuning</span>
          </label>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Chart Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Total Revenue by Product Line"
            />
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Theme Palette</span>
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setColorPalette(p.id)}
                  className={`w-7 h-7 rounded-full ${p.color} transition-all flex items-center justify-center ${
                    colorPalette === p.id ? "ring-2 ring-white scale-110 shadow-md" : "opacity-75 hover:opacity-100"
                  }`}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          {/* High Cardinality Safeguard */}
          {chartType !== "scatter" && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Max Categories</label>
                <input
                  type="number"
                  min={3}
                  max={50}
                  value={maxCategories}
                  onChange={(e) => setMaxCategories(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="includeOther"
                  checked={includeOther}
                  onChange={(e) => setIncludeOther(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="includeOther" className="text-xs text-slate-300 select-none cursor-pointer">
                  Group in "Other"
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Column (Right) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Live Preview Canvas Container */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-400">
                {chartType.toUpperCase()} • {chartType === "scatter" ? `${yColumn} vs ${xColumn}` : `${xColumn} (${aggregation.toUpperCase()})`}
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{initialChart ? "Update Chart" : "Save to My Charts"}</span>
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cardinality or Null Warning Banner */}
          {previewPayload?.warning && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{previewPayload.warning}</span>
            </div>
          )}

          {/* Canvas Viewport */}
          <div className="pt-2">
            {previewPayload ? (
              <ChartRenderer config={activeConfig} payload={previewPayload} height={380} />
            ) : (
              <div className="h-[380px] flex items-center justify-center text-slate-500 text-xs">
                Generating visualization...
              </div>
            )}
          </div>

          {/* Metrics summary bar */}
          {previewPayload && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Points Plotted: <strong className="text-slate-200">{previewPayload.total_points}</strong></span>
              {previewPayload.dropped_null_count > 0 && (
                <span className="text-amber-400">
                  Nulls Excluded: {previewPayload.dropped_null_count}
                </span>
              )}
              <span className="text-emerald-400">Status: Valid</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
