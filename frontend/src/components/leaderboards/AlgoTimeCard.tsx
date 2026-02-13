"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlgoTimeDataTable } from "./AlgoTimeDataTable";
import type { Participant } from "@/types/account/Participant.type";
import { Copy, Check, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  readonly participants: Participant[];
  readonly currentUserId?: number;
}

export function AlgoTimeCard({ participants, currentUserId }: Props) {
  const [copied, setCopied] = useState(false);

  if (!participants || participants.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    // Build a plain-text tab-separated table from ALL participants (not just the visible page)
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
        const success = document.execCommand("copy"); // eslint-disable-line @typescript-eslint/no-deprecated
        if (!success) throw new Error("execCommand copy failed");
      } finally {
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

    // Set column widths
    worksheet["!cols"] = [
      { wch: 6 },   // Rank
      { wch: 24 },  // Name
      { wch: 14 },  // Total Points
      { wch: 17 },  // Problems Solved
      { wch: 14 },  // Total Time
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AlgoTime Leaderboard");
    XLSX.writeFile(workbook, "algotme-leaderboard.xlsx");
  };

  return (
    <Card className="mb-6 shadow-sm border border-[#8065CD] bg-white">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#8065CD]">
            AlgoTime Leaderboard
          </CardTitle>
          <p className="text-sm text-gray-500">All-time rankings</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title="Copy entire table to clipboard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-[#8065CD] hover:text-[#8065CD] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
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
            title="Download as Excel file"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[#8065CD] text-white hover:bg-[#6a52b3] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
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