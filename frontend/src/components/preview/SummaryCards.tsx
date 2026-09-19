"use client";

import React from "react";
import { DatasetSummary } from "@/lib/types";
import { 
  Layers, 
  Columns, 
  AlertTriangle, 
  CopyCheck, 
  HardDrive, 
  FileText,
  HelpCircle
} from "lucide-react";

interface SummaryCardsProps {
  summary: DatasetSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Rows",
      value: summary.row_count.toLocaleString(),
      subtitle: `${summary.columns.length} columns loaded`,
      icon: Layers,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Total Columns",
      value: summary.column_count.toString(),
      subtitle: "Features / Attributes",
      icon: Columns,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Missing Values",
      value: summary.missing_cells_count.toLocaleString(),
      subtitle: `${summary.missing_cells_percentage}% of all cells`,
      icon: AlertTriangle,
      color: summary.missing_cells_count > 0 ? "text-amber-400" : "text-emerald-400",
      bgColor: summary.missing_cells_count > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Duplicate Rows",
      value: summary.duplicate_rows_count.toLocaleString(),
      subtitle: summary.duplicate_rows_count > 0 ? "Potential redundancy" : "No duplicates found",
      icon: CopyCheck,
      color: summary.duplicate_rows_count > 0 ? "text-rose-400" : "text-emerald-400",
      bgColor: summary.duplicate_rows_count > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Memory Size",
      value: summary.memory_usage_formatted,
      subtitle: `Disk: ${summary.file_size_formatted}`,
      icon: HardDrive,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "File Format",
      value: summary.file_type.toUpperCase(),
      subtitle: "Parsed via Pandas Engine",
      icon: FileText,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg border ${c.bgColor} ${c.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="text-xl font-bold tracking-tight text-white">
                {c.value}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {c.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
