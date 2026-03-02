"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlgoTimeDataTable } from "./AlgoTimeDataTable";
import type { Participant } from "@/types/account/Participant.type";
import { Copy, Check, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "../ui/button";

interface Props {
  readonly participants: Participant[];
  readonly currentUserId?: number;
}

export function AlgoTimeCard({ participants, currentUserId }: Props) {
  const [copied, setCopied] = useState(false);
  const { trackLeaderboardCopied, trackLeaderboardDownloaded } = useAnalytics();

  if (!participants || participants.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    const header = ["Rank", "Name", "Total Points", "Problems Solved", "Total Time"].join("\t");
    const rows = participants.map((p) =>
      [p.rank, p.name, p.total_score, p.problems_solved, p.total_time].join("\t")
    );
    const text = [header, ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where the async Clipboard API is unavailable
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        // sonar error expected, its a fall back for older browsers
        const success = document.execCommand("copy"); // eslint-disable-line @typescript-eslint/no-deprecated
        if (!success) throw new Error("execCommand copy failed");
      } finally {
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    trackLeaderboardCopied("algotime");
  };

  const handleDownload = () => {
    const rows = participants.map((p) => ({
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "AlgoTime Leaderboard");
    XLSX.writeFile(workbook, "algotme-leaderboard.xlsx");

    trackLeaderboardDownloaded("algotime");
  };

  return (
    <Card className="mb-6 bg-white">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div>
          <CardTitle className="text-lg font-semibold text-primary">
            AlgoTime Leaderboard
          </CardTitle>
          <p className="text-sm text-gray-500">All-time rankings</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            title="Copy entire table to clipboard"
            variant="outline"
            className="flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-primary" />
                Copy
              </>
            )}
          </Button>

          <Button
            onClick={handleDownload}
            title="Download as Excel file"
            variant="default"
            className="flex items-center gap-1.5 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto p-6 bg-white border-t">
        <AlgoTimeDataTable
          participants={participants}
          currentUserId={currentUserId}
        />
      </CardContent>
    </Card>
  );
}