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

type CopyButtonState = "idle" | "exporting" | "copied";

function CopyButtonContent({ state }: { state: CopyButtonState }) {
  if (state === "copied") {
    return (
      <>
        <Check className="w-4 h-4 text-green-500" />
        <span className="text-green-500">Copied!</span>
      </>
    );
  }
  if (state === "exporting") {
    return (
      <>
        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{" "}
        Fetching...
      </>
    );
  }
  return (
    <>
      <Copy className="w-4 h-4" />
      Copy
    </>
  );
}

function DownloadButtonContent({ exporting }: { exporting: boolean }) {
  if (exporting) {
    return (
      <>
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
        Fetching...
      </>
    );
  }
  return (
    <>
      <Download className="w-4 h-4" />
      Download
    </>
  );
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
        // Fallback for environments where the async Clipboard API is unavailable
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const success = document.execCommand("copy"); // eslint-disable-line @typescript-eslint/no-deprecated
          if (!success) throw new Error("execCommand copy failed");
        } finally {
          textArea.remove();
        }
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
      const sheetName = competition.competitionTitle.slice(0, 31).replaceAll(/[\\/*?:[\]]/g, "");
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Competition");

      const fileName = `${competition.competitionTitle.replaceAll(/[^a-z0-9]/gi, "-").toLowerCase()}-leaderboard.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } finally {
      setExporting(false);
    }
  };

  const copyButtonState: CopyButtonState = copied ? "copied" : exporting ? "exporting" : "idle";

  return (
    <Card className={`mb-6 shadow-sm border ${isCurrent ? "border-[#8065CD]" : "border-gray-200"} ${backgroundColor}`}>
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
            <CopyButtonContent state={copyButtonState} />
          </button>

          <button
            onClick={handleDownload}
            disabled={exporting}
            title="Download as Excel file"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[#8065CD] text-white hover:bg-[#6a52b3] transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            <DownloadButtonContent exporting={exporting} />
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