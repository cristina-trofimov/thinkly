"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Competition } from "./Leaderboards";
import { ScoreboardDataTable } from "./ScoreboardDataTable";

interface Props {
  competition: Competition;
}

export function CompetitionCard({ competition }: Props) {
  const [open, setOpen] = useState(false);

  const hasScoreboard = competition.participants && competition.participants.length > 0;

  return (
    <Card
      className={`mb-6 shadow-sm border ${
        hasScoreboard ? "border-gray-200" : "border-blue-200"
      } ${open ? "bg-white" : hasScoreboard ? "bg-gray-50" : "bg-blue-50"}`}
    >
      <CardHeader
        onClick={() => hasScoreboard && setOpen(!open)}
        className={`flex flex-row items-center justify-between px-6 py-4 ${
          !hasScoreboard ? "opacity-70 cursor-default" : "cursor-pointer"
        }`}
      >
        <div>
          <CardTitle
            className={`text-lg font-semibold ${
              hasScoreboard ? "text-[#8065CD]" : "text-blue-700"
            }`}
          >
            {competition.name}
          </CardTitle>
          <p className="text-sm text-gray-500">{competition.date}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasScoreboard ? (
            open ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )
          ) : (
            <span className="px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full">
              Upcoming
            </span>
          )}
        </div>
      </CardHeader>

      {hasScoreboard && open && (
        <CardContent className="overflow-x-auto p-6 bg-white border-t">
          <ScoreboardDataTable participants={competition.participants} />
        </CardContent>
      )}
    </Card>
  );
}
