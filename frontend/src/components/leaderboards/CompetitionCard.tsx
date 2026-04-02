"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScoreboardDataTable } from "./ScoreboardDataTable";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import * as XLSX from "xlsx";
import { getAllCompetitionEntries } from "@/api/LeaderboardsAPI";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "../ui/button";

interface Props {
  readonly competition: CompetitionWithParticipants;
  readonly isCurrent?: boolean;
  readonly currentUserId?: number;
}

type CopyButtonState = "idle" | "exporting" | "copied";

function CopyButtonContent({ state }: { readonly state: CopyButtonState }) {
  if (state === "copied") {
    return (
      <>
        <Check className="w-4 h-4 text-emerald-500" />
        <span className="text-emerald-500">Copied!</span>
      </>
    );
  }
  if (state === "exporting") {
    return (
      <>
        <span className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />{" "}
        Fetching...
      </>
    );
  }
  return (
    <>
      <Copy className="w-4 h-4 text-primary" />
      Copy
    </>
  );
}

function DownloadButtonContent({ exporting }: { readonly exporting: boolean }) {
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

/**
 * Fallback clipboard copy for browsers that don't support the async Clipboard API.
 * Uses the legacy `execCommand("copy")` — deprecated but still widely supported as
 * a fallback. The deprecation warning is expected and intentional here.
 */
function fallbackCopyToClipboard(text: string): void {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    // leave this error in sonarqube
    const success = document.execCommand("copy"); // NOSONAR
    if (!success) throw new Error("execCommand copy failed");
  } finally {
    textArea.remove();
  }
}

export function CompetitionCard({
  competition,
  isCurrent = false,
  currentUserId,
}: Props) {
  const [open, setOpen] = useState(isCurrent);
  const [copied, setCopied] = useState(false);
  const [copyExporting, setCopyExporting] = useState(false);
  const [downloadExporting, setDownloadExporting] = useState(false);

  const {
    trackCompetitionCardToggled,
    trackLeaderboardCopied,
    trackLeaderboardDownloaded,
  } = useAnalytics();

  const hasScoreboard =
    competition.participants && competition.participants.length > 0;

  if (!hasScoreboard) {
    return null;
  }

  let backgroundColor = "bg-muted/50";
  if (open) {
    backgroundColor = "bg-card";
  } else if (isCurrent) {
    backgroundColor = "bg-accent/50";
  }

  const statusIndicator = open ? (
    <ChevronUp className="w-5 h-5 text-muted-foreground" />
  ) : (
    <ChevronDown className="w-5 h-5 text-muted-foreground" />
  );

  const fetchAllParticipants = async () => {
    return await getAllCompetitionEntries(competition.id);
  };

  const handleToggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    trackCompetitionCardToggled(
      competition.competitionTitle,
      newOpen ? "expanded" : "collapsed",
      isCurrent
    );
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopyExporting(true);
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
        fallbackCopyToClipboard(text);
      }

      trackLeaderboardCopied("competition", competition.competitionTitle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setCopyExporting(false);
    }
  };


  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadExporting(true);
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
      const sheetName = competition.competitionTitle
        .slice(0, 31)
        .replaceAll(/[\\/*?:[\]]/g, "");
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sheetName || "Competition"
      );

      const fileName = `${competition.competitionTitle
        .replaceAll(/[^a-z0-9]/gi, "-")
        .toLowerCase()}-leaderboard.xlsx`;
      XLSX.writeFile(workbook, fileName);

      trackLeaderboardDownloaded("competition", competition.competitionTitle);
    } finally {
      setDownloadExporting(false);
    }
  };

  let copyButtonState: CopyButtonState = "idle";
  if (copied) {
    copyButtonState = "copied";
  } else if (copyExporting) {
    copyButtonState = "exporting";
  }

  console.log("time", competition.participants.map(p => p.total_time))

  return (
    <Card className={`mb-6 shadow-sm border ${isCurrent ? "border-primary" : "border-border"} ${backgroundColor}`}>
      <CardHeader
        onClick={handleToggle}
        className="flex flex-row items-center justify-between px-6 py-4 cursor-pointer"
      >
        <div>
          <CardTitle className="text-lg font-semibold text-primary">
            {competition.competitionTitle}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
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
          <Button
            onClick={handleCopy}
            disabled={copyExporting}
            title="Copy leaderboard to clipboard"
            variant="outline"
            className="flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            <CopyButtonContent state={copyButtonState} />
          </Button>

          <Button
            onClick={handleDownload}
            disabled={downloadExporting}
            title="Download as Excel file"
            className="flex items-center gap-1.5 transition-colors disabled:cursor-wait"
          >
            <DownloadButtonContent exporting={downloadExporting} />
          </Button>

          {statusIndicator}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="overflow-x-auto p-6 bg-card border-t">
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