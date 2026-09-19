"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DatasetSummary, PaginatedRows, ColumnMeta } from "@/lib/types";
import { fetchDatasetPreview, editDatasetCell } from "@/lib/api";
import { useDataset } from "@/lib/store";
import TablePagination from "./TablePagination";
import ColumnStats from "./ColumnStats";
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Info, 
  Filter, 
  Hash, 
  Type, 
  Calendar, 
  Binary, 
  Loader2,
  RefreshCw
} from "lucide-react";

interface DataTableProps {
  summary: DatasetSummary;
}

export default function DataTable({ summary }: DataTableProps) {
  const { loadAndSaveDataset } = useDataset();
  const [data, setData] = useState<PaginatedRows | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedColumn, setSelectedColumn] = useState<ColumnMeta | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string; value: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDatasetPreview(
        summary.id,
        page,
        pageSize,
        searchQuery,
        sortColumn,
        sortDirection
      );
      setData(res);
    } catch (err) {
      console.error("Failed to load table data", err);
    } finally {
      setLoading(false);
    }
  }, [summary.id, page, pageSize, searchQuery, sortColumn, sortDirection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(undefined);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(colName);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Number":
        return <Hash className="w-3 h-3 text-emerald-400" />;
      case "Date":
        return <Calendar className="w-3 h-3 text-purple-400" />;
      case "Boolean":
        return <Binary className="w-3 h-3 text-amber-400" />;
      default:
        return <Type className="w-3 h-3 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden">
      {/* Top Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across all cells..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            onClick={() => loadData()}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 self-end sm:self-auto">
          <span className="hidden md:inline text-slate-500">
            Tip: Click column header to inspect distribution & stats
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              # Number
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
              T Text
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
              D Date
            </span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Viewport */}
      <div className="relative overflow-x-auto max-h-[600px] min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-30 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 shadow-xl text-xs text-slate-300 font-medium">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Fetching rows...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left spreadsheet-table text-xs">
          <thead>
            <tr>
              {/* Row Index Column Header */}
              <th className="spreadsheet-header-cell w-14 min-w-[56px] text-center text-[10px] uppercase font-mono font-bold text-slate-500 py-2 px-2 select-none">
                #
              </th>

              {/* Data Column Headers */}
              {summary.columns.map((col) => {
                const isSorted = sortColumn === col.name;
                return (
                  <th
                    key={col.index}
                    className="spreadsheet-header-cell min-w-[160px] p-2.5 select-none hover:bg-slate-850 transition-colors group cursor-pointer"
                    onClick={() => handleSort(col.name)}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                          {col.letter}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          {getTypeIcon(col.data_type)}
                          <span>{col.data_type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSorted && (
                          <span className="text-cyan-400">
                            {sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColumn(col);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                          title="Inspect column distribution"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 truncate max-w-[140px]" title={col.name}>
                        {col.name}
                      </span>
                      {col.null_count > 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono" title={`${col.null_count} null values`}>
                          {col.null_count} nulls
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {data && data.rows.length > 0 ? (
              data.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-indigo-500/[0.04] transition-colors border-b border-slate-900"
                >
                  {/* Sticky Row Index */}
                  <td className="spreadsheet-row-index-cell text-center text-slate-500 text-[11px] py-2 px-2 select-none">
                    {row._row_index}
                  </td>

                  {/* Cell Values */}
                  {summary.columns.map((col) => {
                    const val = row[col.name];
                    const isNull = val === null || val === undefined;
                    const isEditing = editingCell?.rowIndex === row._row_index && editingCell?.colName === col.name;

                    return (
                      <td
                        key={col.index}
                        onDoubleClick={() => {
                          setEditingCell({
                            rowIndex: Number(row._row_index),
                            colName: col.name,
                            value: isNull ? "" : String(val),
                          });
                        }}
                        className={`spreadsheet-cell py-2 px-3 text-slate-200 truncate max-w-[240px] font-sans cursor-pointer ${
                          col.data_type === "Number" ? "font-mono text-right" : ""
                        } ${isEditing ? "p-0" : ""}`}
                        title={isNull ? "<null> (Double click to edit)" : `${String(val)} (Double click to edit)`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                try {
                                  const res = await editDatasetCell(summary.id, {
                                    row_index: editingCell.rowIndex,
                                    column_name: editingCell.colName,
                                    new_value: editingCell.value,
                                  });
                                  await loadAndSaveDataset(res.summary);
                                  setEditingCell(null);
                                  loadData();
                                } catch (err: any) {
                                  alert(err.message || "Failed to update cell.");
                                }
                              } else if (e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                            onBlur={async () => {
                              if (editingCell) {
                                try {
                                  const res = await editDatasetCell(summary.id, {
                                    row_index: editingCell.rowIndex,
                                    column_name: editingCell.colName,
                                    new_value: editingCell.value,
                                  });
                                  await loadAndSaveDataset(res.summary);
                                  setEditingCell(null);
                                  loadData();
                                } catch (err: any) {
                                  setEditingCell(null);
                                }
                              }
                            }}
                            className="w-full h-full px-2 py-1.5 bg-indigo-950 border-2 border-indigo-500 rounded text-white text-xs font-sans focus:outline-none shadow-lg"
                          />
                        ) : isNull ? (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono text-rose-400 bg-rose-500/10 rounded border border-rose-500/20 italic">
                            &lt;null&gt;
                          </span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : !loading ? (
              <tr>
                <td
                  colSpan={summary.columns.length + 1}
                  className="text-center py-12 text-slate-400"
                >
                  No matching rows found for query &ldquo;{searchQuery}&rdquo;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalRows={data.total_rows}
          totalPages={data.total_pages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Column Stats Inspector Modal */}
      {selectedColumn && (
        <ColumnStats
          column={selectedColumn}
          onClose={() => setSelectedColumn(null)}
        />
      )}
    </div>
  );
}
