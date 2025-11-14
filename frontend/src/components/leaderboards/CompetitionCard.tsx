"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScoreboardDataTable } from "./ScoreboardDataTable";
import type { Competition } from "../interfaces/Competition";

interface Props {
  readonly competition: Competition;
}

export function CompetitionCard({ competition }: Props) {
  const [open, setOpen] = useState(false);

  const hasScoreboard = competition.participants && competition.participants.length > 0;

  // No render if no scoreboard (empty competition)
    if (!hasScoreboard) {
    return null;
  }

  const backgroundColor = open ? "bg-white" : "bg-gray-50";
  const statusIndicator = open ? (
    <ChevronUp className="w-5 h-5 text-gray-600" />
  ) : (
    <ChevronDown className="w-5 h-5 text-gray-600" />
  );

  return (
    <Card className={`mb-6 shadow-sm border border-gray-200 ${backgroundColor}`}>
      <CardHeader
        onClick={() => setOpen(!open)}
        className="flex flex-row items-center justify-between px-6 py-4 cursor-pointer"
      >
        <div>
          <CardTitle className="text-lg font-semibold text-[#8065CD]">
            {competition.name}
          </CardTitle>
          <p className="text-sm text-gray-500">{competition.date}</p>
        </div>

        <div className="flex items-center gap-2">
          {statusIndicator}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="overflow-x-auto p-6 bg-white border-t">
          <ScoreboardDataTable participants={competition.participants} />
        </CardContent>
      )}
    </Card>
  );
}