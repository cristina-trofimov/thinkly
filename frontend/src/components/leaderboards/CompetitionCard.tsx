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

  return (
    <Card
  className={`mb-6 shadow-sm border border-gray-200 ${
    open ? "bg-white" : "bg-gray-50"
  }`}
>
  <CardHeader
    onClick={() => setOpen(!open)}
    className="cursor-pointer flex flex-row items-center justify-between px-6 py-4"
  >
    <div>
      <CardTitle className="text-[#8065CD] text-lg font-semibold">
        {competition.name}
      </CardTitle>
      <p className="text-sm text-gray-500">{competition.date}</p>
    </div>
    {open ? (
      <ChevronUp className="w-5 h-5 text-gray-600" />
    ) : (
      <ChevronDown className="w-5 h-5 text-gray-600" />
    )}
  </CardHeader>

  {open && (
    <CardContent className="overflow-x-auto p-6 bg-white border-t">
        <ScoreboardDataTable participants={competition.participants} />
    </CardContent>
  )}
</Card>
  );
}
