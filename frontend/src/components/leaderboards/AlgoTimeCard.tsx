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
import { Button } from "../ui/button";

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
  const [copyState, setCopyState] = useState<ExportState>("idle");
  const [downloadState, setDownloadState] = useState<ExportState>("idle");

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
    setCopyState("exporting");
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
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  };

  const handleDownload = async () => {
    setDownloadState("exporting");
    try {
      const all = await getAllAlgoTimeEntriesForExport();
      const worksheet = XLSX.utils.json_to_sheet(buildExportRows(all));
      worksheet["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 17 }, { wch: 14 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "AlgoTime Leaderboard");
      XLSX.writeFile(workbook, "algotime-leaderboard.xlsx");
      trackLeaderboardDownloaded("algotime");
    } finally {
      setDownloadState("idle");
    }
  };

  const isCopyBusy = copyState !== "idle";
  const isDownloadBusy = downloadState !== "idle";
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  let copyButtonContent: React.ReactNode;
  if (copyState === "copied") {
    copyButtonContent = (
      <>
        <Check className="w-4 h-4 text-emerald-500" />
        <span className="text-emerald-500">Copied!</span>
      </>
    );
  } else if (copyState === "exporting") {
    copyButtonContent = (
      <>
        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{" "}
        Fetching...
      </>
    );
  } else {
    copyButtonContent = (
      <>
        <Copy className="w-4 h-4 text-primary" />
        Copy
      </>
    );
  }

  return (
    <Card className="mb-6 bg-card">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div>
          <CardTitle className="text-lg font-semibold text-primary">
            AlgoTime Leaderboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">All-time rankings</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            disabled={isCopyBusy}
            title="Copy entire table to clipboard"
            variant="outline"
            className="flex items-center gap-1.5  disabled:opacity-50 disabled:cursor-wait"
          >
            {copyButtonContent}
          </Button>

          <Button
            onClick={handleDownload}
            disabled={isDownloadBusy}
            title="Download as Excel file"
            variant="default"
            className="flex items-center gap-1.5 text-sm transition-colors"
          >
            {isDownloadBusy ? (
              <>
                <span className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />{" "}
                Fetching...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto p-6 bg-card border-t">
        {error && (
          <div className="text-center py-6 text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
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