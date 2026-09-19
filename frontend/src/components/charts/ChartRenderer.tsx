"use client";

import React, { useEffect, useRef } from "react";
import { Chart as ChartJS } from "chart.js/auto";
import { ChartConfig, ChartDataPayload } from "@/lib/types";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface ChartRendererProps {
  config: ChartConfig;
  payload: ChartDataPayload;
  height?: number;
}

const PALETTES = {
  indigo: {
    primary: "#6366f1",
    bg: "rgba(99, 102, 241, 0.25)",
    border: "#818cf8",
    multi: [
      "#6366f1", "#38bdf8", "#ec4899", "#8b5cf6", "#10b981", 
      "#f59e0b", "#14b8a6", "#f43f5e", "#a855f7", "#06b6d4"
    ]
  },
  emerald: {
    primary: "#10b981",
    bg: "rgba(16, 185, 129, 0.25)",
    border: "#34d399",
    multi: [
      "#10b981", "#06b6d4", "#84cc16", "#14b8a6", "#3b82f6", 
      "#eab308", "#22c55e", "#0ea5e9", "#a3e635", "#2dd4bf"
    ]
  },
  amber: {
    primary: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.25)",
    border: "#fbbf24",
    multi: [
      "#f59e0b", "#f97316", "#eab308", "#ef4444", "#84cc16", 
      "#d97706", "#ea580c", "#ca8a04", "#dc2626", "#65a30d"
    ]
  },
  rose: {
    primary: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.25)",
    border: "#fb7185",
    multi: [
      "#f43f5e", "#ec4899", "#d946ef", "#e11d48", "#db2777", 
      "#c026d3", "#f472b6", "#fb7185", "#e879f9", "#fda4af"
    ]
  },
  purple: {
    primary: "#a855f7",
    bg: "rgba(168, 85, 247, 0.25)",
    border: "#c084fc",
    multi: [
      "#a855f7", "#8b5cf6", "#6366f1", "#d946ef", "#ec4899", 
      "#9333ea", "#7c3aed", "#4f46e5", "#c026d3", "#db2777"
    ]
  },
  cyan: {
    primary: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.25)",
    border: "#22d3ee",
    multi: [
      "#06b6d4", "#0284c7", "#3b82f6", "#14b8a6", "#10b981", 
      "#0891b2", "#0369a1", "#2563eb", "#0d9488", "#059669"
    ]
  },
};

export default function ChartRenderer({ config, payload, height = 340 }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  // If column deleted/renamed (proactive protection)
  if (!payload.is_valid) {
    return (
      <div 
        style={{ height }}
        className="w-full rounded-xl bg-amber-500/5 border border-amber-500/20 p-6 flex flex-col items-center justify-center text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-1">
          <h4 className="text-sm font-semibold text-amber-200">Referenced Column Missing</h4>
          <p className="text-xs text-amber-300/80">
            {payload.error_message || `Columns [${payload.missing_columns.join(", ")}] were deleted or renamed in data cleaning.`}
          </p>
        </div>
        <span className="text-[11px] font-mono bg-slate-900 px-2.5 py-1 rounded text-slate-400 border border-slate-800">
          Tip: Edit chart to select available columns
        </span>
      </div>
    );
  }

  // If no data
  if (!payload.datasets || payload.datasets.length === 0 || payload.total_points === 0) {
    return (
      <div 
        style={{ height }}
        className="w-full rounded-xl bg-slate-900/30 border border-slate-800/80 p-6 flex flex-col items-center justify-center text-center space-y-2 text-slate-500"
      >
        <HelpCircle className="w-8 h-8 text-slate-600" />
        <p className="text-xs">No data points to render</p>
      </div>
    );
  }

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const paletteKey = (config.color_palette as keyof typeof PALETTES) || "indigo";
    const palette = PALETTES[paletteKey] || PALETTES.indigo;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const isPie = config.type === "pie";
    const isScatter = config.type === "scatter";
    const isLine = config.type === "line";
    const isBar = config.type === "bar";

    // Build Chart.js datasets with rich styling
    const formattedDatasets = payload.datasets.map((ds) => {
      if (isPie) {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: palette.multi.slice(0, ds.data.length),
          borderColor: "#0f172a",
          borderWidth: 2,
        };
      }

      if (isScatter) {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: palette.primary,
          borderColor: palette.border,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
      }

      if (isLine) {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: palette.bg,
          borderColor: palette.primary,
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
        };
      }

      // Default: Bar
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: palette.primary,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 4,
      };
    });

    // Chart.js Configuration
    const chartType = isPie ? "doughnut" : (config.type as any);

    chartInstanceRef.current = new ChartJS(ctx, {
      type: chartType,
      data: {
        labels: isScatter ? undefined : payload.labels,
        datasets: formattedDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
        },
        plugins: {
          legend: {
            display: config.show_legend ?? true,
            position: isPie ? "right" : "top",
            labels: {
              color: "#94a3b8",
              font: {
                size: 11,
                family: "Inter, sans-serif",
              },
              boxWidth: 12,
              padding: 14,
            },
          },
          tooltip: {
            backgroundColor: "#0f172a",
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(51, 65, 85, 0.8)",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: !isPie ? {
          x: {
            grid: {
              display: config.show_grid ?? true,
              color: "rgba(51, 65, 85, 0.3)",
            },
            ticks: {
              color: "#64748b",
              font: { size: 10 },
              maxRotation: 45,
            },
          },
          y: {
            grid: {
              display: config.show_grid ?? true,
              color: "rgba(51, 65, 85, 0.3)",
            },
            ticks: {
              color: "#64748b",
              font: { size: 10 },
            },
          },
        } : undefined,
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config, payload]);

  return (
    <div className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
