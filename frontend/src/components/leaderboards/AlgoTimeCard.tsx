"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlgoTimeDataTable } from "./AlgoTimeDataTable";
import { Copy, Check, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  getAlgoTimeEntries,
  getAllAlgoTimeEntriesForExport,
  type AlgoTimeEntry,
  type AlgoTimePage,
} from "@/api/LeaderboardsAPI";

const PAGE_SIZE = 15;

interface Props {
  readonly currentUserId?: number;
}

type ExportState = "idle" | "exporting" | "copied";

export function AlgoTimeCard({ currentUserId }: Props) {
  const [data, setData] = useState<AlgoTimePage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportState, setExportState] = useState<ExportState>("idle");

  const { trackLeaderboardCopied, trackLeaderboardDownloaded } = useAnalytics();

  // ─── Fetch a page from the backend whenever page or search changes ───────
  const fetchPage = useCallback(async (nextPage: number, nextSearch: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAlgoTimeEntries({
        currentUserId,
        search: nextSearch,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      console.error("Error fetching AlgoTime entries:", err);
      setError("Failed to load AlgoTime leaderboard");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Initial load and re-fetch when currentUserId resolves
  useEffect(() => {
    fetchPage(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchPage(1, value);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    fetchPage(nextPage, search);
  };

  // ─── Export helpers (call the /all endpoint so every row is included) ────

  const buildExportRows = (entries: AlgoTimeEntry[]) =>
    entries.map((p) => ({
      Rank: p.rank,
      Name: p.name,
      "Total Points": p.total_score,
      "Problems Solved": p.problems_solved,
      "Total Time": p.total_time,
    }));

  const handleCopy = async () => {
    setExportState("exporting");
    try {
      const all = await getAllAlgoTimeEntriesForExport();
      const header = ["Rank", "Name", "Total Points", "Problems Solved", "Total Time"].join("\t");
      const rows = all.map((p) =>
        [p.rank, p.name, p.total_score, p.problems_solved, p.total_time].join("\t")
      );
      const text = [header, ...rows].join("\n");

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          const ok = document.execCommand("copy"); // NOSONAR(typescript:S1874) - intentional fallback when Clipboard API is unavailable
          if (!ok) throw new Error("execCommand copy failed");
        } finally {
          ta.remove();
        }
      }

      trackLeaderboardCopied("algotime");
      setExportState("copied");
      setTimeout(() => setExportState("idle"), 2000);
    } catch {
      setExportState("idle");
    }
  };

  const handleDownload = async () => {
    setExportState("exporting");
    try {
      const all = await getAllAlgoTimeEntriesForExport();
      const worksheet = XLSX.utils.json_to_sheet(buildExportRows(all));
      worksheet["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 17 }, { wch: 14 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "AlgoTime Leaderboard");
      XLSX.writeFile(workbook, "algotime-leaderboard.xlsx");
      trackLeaderboardDownloaded("algotime");
    } finally {
      setExportState("idle");
    }
  };

  const isBusy = exportState !== "idle";
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  let copyButtonContent: React.ReactNode;
  if (exportState === "copied") {
    copyButtonContent = (
      <>
        <Check className="w-4 h-4 text-green-500" />
        <span className="text-green-500">Copied!</span>
      </>
    );
  } else if (exportState === "exporting") {
    copyButtonContent = (
      <>
        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{" "}
        Fetching...
      </>
    );
  } else {
    copyButtonContent = (
      <>
        <Copy className="w-4 h-4" />
        Copy
      </>
    );
  }

  return (
    <Card className="mb-6 shadow-sm border border-[#8065CD] bg-white">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#8065CD]">
            AlgoTime Leaderboard
          </CardTitle>
          <p className="text-sm text-gray-500">All-time rankings</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={isBusy}
            title="Copy entire table to clipboard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-[#8065CD] hover:text-[#8065CD] transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {copyButtonContent}
          </button>

          <button
            onClick={handleDownload}
            disabled={isBusy}
            title="Download as Excel file"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[#8065CD] text-white hover:bg-[#6a52b3] transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {exportState === "exporting" ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Fetching...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download
              </>
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto p-6 bg-white border-t">
        {error && (
          <div className="text-center py-6 text-red-500 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        {!error && (
          <AlgoTimeDataTable
            participants={data?.entries ?? []}
            currentUserId={currentUserId}
            loading={loading}
            search={search}
            onSearchChange={handleSearchChange}
            page={page}
            totalPages={totalPages}
            total={data?.total ?? 0}
            onPageChange={handlePageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}