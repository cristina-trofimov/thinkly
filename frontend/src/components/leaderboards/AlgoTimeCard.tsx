"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlgoTimeDataTable } from "./AlgoTimeDataTable";
import type { Participant } from "@/types/account/Participant.type";




interface Props {
  readonly participants: Participant[];
  readonly currentUserId?: number;
}

export function AlgoTimeCard({ participants, currentUserId }: Props) {
  if (!participants || participants.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 shadow-sm border border-[#8065CD] bg-white">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#8065CD]">
            AlgoTime Leaderboard
          </CardTitle>
          <p className="text-sm text-gray-500">
            All-time rankings
          </p>
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