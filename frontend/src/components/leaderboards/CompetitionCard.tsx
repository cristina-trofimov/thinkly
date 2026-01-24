"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScoreboardDataTable } from "./ScoreboardDataTable";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";

interface Props {
  readonly competition: CompetitionWithParticipants;
  readonly isCurrent?: boolean;
  readonly currentUserId?: number;
}

export function CompetitionCard({ competition, isCurrent = false, currentUserId }: Props) {
  const [open, setOpen] = useState(isCurrent); // Auto-open if current competition

  const hasScoreboard = competition.participants && competition.participants.length > 0;

  // No render if no scoreboard (empty competition)
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