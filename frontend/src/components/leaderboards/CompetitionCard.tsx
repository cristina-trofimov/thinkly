"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScoreboardDataTable } from "./ScoreboardDataTable";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import * as XLSX from "xlsx";
import { getAllCompetitionEntries } from "@/api/LeaderboardsAPI";

interface Props {
  readonly competition: CompetitionWithParticipants;
  readonly isCurrent?: boolean;
  readonly currentUserId?: number;
}

export function CompetitionCard({ competition, isCurrent = false, currentUserId }: Props) {
  const [open, setOpen] = useState(isCurrent);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hasScoreboard = competition.participants && competition.participants.length > 0;

  if (!hasScoreboard) {
    return null;
  }

  let backgroundColor = "bg-gray-50";
  if (open) {
    backgroundColor = "bg-white";
  } else if (isCurrent) {
    backgroundColor = "bg-purple-50";
  }

  const statusIndicator = open ? (
    <ChevronUp className="w-5 h-5 text-gray-600" />
  ) : (
    <ChevronDown className="w-5 h-5 text-gray-600" />
  );

  // Fetch ALL participants (bypasses the top-10 filter used for display)
  const fetchAllParticipants = async () => {
    return await getAllCompetitionEntries(competition.id);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const allParticipants = await fetchAllParticipants();
      const header = ["Rank", "Name", "Total Points", "Problems Solved", "Total Time"].join("\t");
      const rows = allParticipants.map((p) =>
        [p.rank, p.name, p.total_score, p.problems_solved, p.total_time].join("\t")
      );
      const text = [header, ...rows].join("\n");

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const allParticipants = await fetchAllParticipants();
      const rows = allParticipants.map((p) => ({
        Rank: p.rank,
        Name: p.name,
        "Total Points": p.total_score,
        "Problems Solved": p.problems_solved,
        "Total Time": p.total_time,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 14 },
        { wch: 17 },
        { wch: 14 },
      ];

      const workbook = XLSX.utils.book_new();
      const sheetName = competition.competitionTitle.slice(0, 31).replace(/[\\/*?:[\]]/g, "");
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Competition");

      const fileName = `${competition.competitionTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-leaderboard.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className={`mb-6 shadow-sm border ${isCurrent ? 'border-[#8065CD]' : 'border-gray-200'} ${backgroundColor}`}>
      <CardHeader
        onClick={() => setOpen(!open)}
        className="flex flex-row items-center justify-between px-6 py-4 cursor-pointer"
      >
        <div>
          <CardTitle className="text-lg font-semibold text-[#8065CD]">
            {competition.competitionTitle}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {competition.date.toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons — stopPropagation keeps the card from toggling */}
          <button
            onClick={handleCopy}
            disabled={exporting}
            title="Copy leaderboard to clipboard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-[#8065CD] hover:text-[#8065CD] transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={exporting}
            title="Download as Excel file"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[#8065CD] text-white hover:bg-[#6a52b3] transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download
              </>
            )}
          </button>

          {statusIndicator}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="overflow-x-auto p-6 bg-white border-t">
          <ScoreboardDataTable
            participants={competition.participants}
            currentUserId={currentUserId}
            showSeparator={competition.showSeparator}
          />
        </CardContent>
      )}
    </Card>
  );
}