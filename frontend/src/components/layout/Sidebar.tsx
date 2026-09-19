"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDataset } from "@/lib/store";
import {
  Table2,
  Filter,
  ArrowUpDown,
  FileQuestion,
  CopyX,
  FileEdit,
  Binary,
  Calculator,
  PieChart,
  BarChart3,
  Layers,
  Download,
  Database,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  phase: number;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "DATASET",
    items: [
      { name: "Preview & Stats", href: "/workspace", icon: Table2, phase: 1 },
    ],
  },
  {
    title: "DATA CLEANING",
    items: [
      { name: "Filter Rows", href: "/workspace?tab=filter", icon: Filter, phase: 2 },
      { name: "Sort Data", href: "/workspace?tab=sort", icon: ArrowUpDown, phase: 2 },
      { name: "Missing Values", href: "/workspace?tab=missing", icon: FileQuestion, phase: 2 },
      { name: "Remove Duplicates", href: "/workspace?tab=duplicates", icon: CopyX, phase: 2 },
      { name: "Edit Data", href: "/workspace?tab=edit", icon: FileEdit, phase: 2 },
      { name: "Data Types", href: "/workspace?tab=types", icon: Binary, phase: 2 },
    ],
  },
  {
    title: "DATA ANALYSIS",
    items: [
      { name: "Column Statistics", href: "/workspace/analysis/stats", icon: Calculator, phase: 3, badge: "Phase 3" },
      { name: "Group By Aggregation", href: "/workspace/analysis/groupby", icon: Layers, phase: 3, badge: "Phase 3" },
      { name: "Pivot Table", href: "/workspace/analysis/pivot", icon: Table2, phase: 3, badge: "Phase 3" },
    ],
  },
  {
    title: "VISUALIZATION",
    items: [
      { name: "Create Chart", href: "/workspace/charts/create", icon: BarChart3, phase: 4, badge: "Phase 4" },
      { name: "My Charts", href: "/workspace/charts", icon: PieChart, phase: 4, badge: "Phase 4" },
    ],
  },
  {
    title: "EXPORT",
    items: [
      { name: "Export Cleaned Data", href: "/workspace/export", icon: Download, phase: 5, badge: "Phase 5" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { activeDataset } = useDataset();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-lg transition-all duration-300 z-30 ${
        collapsed ? "w-16" : "w-64"
      } min-h-[calc(100vh-57px)]`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-md"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <p className="px-2.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {section.title}
              </p>
            )}

            <div className="space-y-0.5">
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isCurrent = pathname === item.href;
                const isReady = item.phase <= 4;

                return (
                  <div key={iIdx} className="relative group">
                    {isReady ? (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          isCurrent
                            ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
                        } ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                        {!collapsed && (
                          <span className="truncate">{item.name}</span>
                        )}
                        {!collapsed && isCurrent && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </Link>
                    ) : (
                      <div
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed select-none ${
                          collapsed ? "justify-center" : ""
                        }`}
                        title={collapsed ? `${item.name} (${item.badge})` : undefined}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-slate-600" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.name}</span>
                            <span className="ml-auto flex items-center gap-1 text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800/80 text-slate-500 font-semibold">
                              <Lock className="w-2.5 h-2.5" />
                              {item.badge}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Active Dataset Footer Summary */}
      {!collapsed && activeDataset && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 m-2 rounded-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Loaded Session</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-200 truncate" title={activeDataset.name}>
            {activeDataset.name}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>{activeDataset.row_count.toLocaleString()} rows</span>
            <span>{activeDataset.column_count} cols</span>
          </div>
        </div>
      )}
    </aside>
  );
}
