"use client";

import { useState, useEffect } from "react";
import { ScoreboardDataTable } from "./ScoreboardDataTable";
import type CurrentStandings from "@/types/leaderboards/CurrentStandings";
import { getCurrentLeaderboardStandings } from "../../api/leaderboardsAPI";



export function CurrentLeaderboard() {
  const [standings, setStandings] = useState<CurrentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentStandings = async () => {
    try {
      setError(null);
      const response = await getCurrentLeaderboardStandings();
      setStandings(response);
    } catch (err) {
      console.error("Error loading current standings:", err);
      setError("Failed to load current standings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentStandings();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getCurrentStandings();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading current standings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!(standings?.participants?.length)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No active competition</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Competition Header */}
      <div className="px-4">
        <h2 className="text-2xl font-bold text-[#8065CD]">
          {standings.competitionName}
        </h2>
        <p className="text-sm text-gray-500">Live Standings • Updates every 60s</p>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 overflow-auto px-4">
        <ScoreboardDataTable participants={standings.participants} />
      </div>
    </div>
  );
}