"use client";

import { useState, useEffect } from "react";
import { ScoreboardDataTable } from "./ScoreboardDataTable";
import axiosClient from "@/lib/axiosClient";
import type { Participant } from "../interfaces/Participant";

interface CurrentStandings {
  competition_name: string;
  participants: Participant[];
}

export function CurrentLeaderboard() {
  const [standings, setStandings] = useState<CurrentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentStandings = async () => {
    try {
      setError(null);

      console.log("Fetching current standings...");
      const response = await axiosClient.get<CurrentStandings>("/standings/current");
      console.log("Current standings response:", response.data);

      setStandings(response.data);
    } catch (err) {
      console.error("Error loading current standings:", err);
      setError("Failed to load current standings");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCurrentStandings();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentStandings();
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
          {standings.competition_name}
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