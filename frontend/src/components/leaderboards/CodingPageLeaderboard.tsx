"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScoreboardDataTable } from "@/components/leaderboards/ScoreboardDataTable";
import {
  getCompetitionLiveLeaderboard,
  getCurrentAlgoTimeLeaderboard,
} from "@/api/LeaderboardsAPI";
import type { CurrentStandings } from "@/types/leaderboards/CurrentStandings.type";

const REFRESH_INTERVAL_MS = 60_000;

interface Props {
  readonly eventId: number;
  readonly eventName: string;
  /** True when the event is a Competition, false when AlgoTime. */
  readonly isCompetitionEvent: boolean;
  readonly currentUserId?: number;
}

export function EventLeaderboard({ eventId, eventName, isCompetitionEvent, currentUserId }: Props) {
  const [standings, setStandings] = useState<CurrentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetchedOnce = useRef(false);

  const fetchStandings = useCallback(async () => {
    try {
      if (!hasFetchedOnce.current) setLoading(true);
      setError(null);

      const result = isCompetitionEvent
        ? await getCompetitionLiveLeaderboard(eventId, currentUserId)
        : await getCurrentAlgoTimeLeaderboard(currentUserId);

      if (isCompetitionEvent) {
        result.competitionName = eventName;
      }

      setStandings(result);
      hasFetchedOnce.current = true;
    } catch {
      setError("Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [eventId, eventName, isCompetitionEvent, currentUserId]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  useEffect(() => {
    const id = setInterval(fetchStandings, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchStandings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading leaderboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
        {error}
      </div>
    );
  }

  if (!standings || standings.participants.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No leaderboard data yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-primary">{standings.competitionName}</h2>
        <span className="text-xs text-muted-foreground">Refreshes every minute</span>
      </div>
      <ScoreboardDataTable
        participants={standings.participants}
        currentUserId={currentUserId}
        showSeparator={standings.showSeparator}
      />
    </div>
  );
}