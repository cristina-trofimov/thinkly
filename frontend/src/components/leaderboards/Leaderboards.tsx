"use client";

import { useState, useEffect, useCallback } from "react";
import { CompetitionCard } from "./CompetitionCard";
import { AlgoTimeCard } from "./AlgoTimeCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import {
  getCompetitionsDetails,
  getCurrentCompetitionLeaderboard,
  type CompetitionsPage,
} from "@/api/LeaderboardsAPI";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useUser } from "@/context/UserContext";

import { Skeleton } from "@/components/ui/skeleton";

export function CompetitionCardSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-1/3" /> {/* Title */}
        <Skeleton className="h-4 w-20" />  {/* Date/Status */}
      </div>
      <div className="space-y-2">
        {[...new Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar */}
            <Skeleton className="h-4 flex-1" />           {/* Name */}
            <Skeleton className="h-4 w-12" />             {/* Score */}
          </div>
        ))}
      </div>
    </div>
  );
}

type LeaderboardType = "competition" | "algotime";

const COMPETITION_PAGE_SIZE = 20;

export function Leaderboards() {
  const [leaderboardType, setLeaderboardType] =
    useState<LeaderboardType>("algotime");

  // Competition state
  const [competitions, setCompetitions] = useState<CompetitionWithParticipants[]>([]);
  const [competitionsPage, setCompetitionsPage] = useState<CompetitionsPage | null>(null);
  const [currentCompetition, setCurrentCompetition] =
    useState<CompetitionWithParticipants | null>(null);

  // Competition query params — sent to backend, no client-side filtering
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUser();

  const {
    trackLeaderboardViewed,
    trackLeaderboardTabSwitched,
    trackLeaderboardSearched,
    trackLeaderboardSortChanged,
  } = useAnalytics();

  // Track initial page view
  useEffect(() => {
    trackLeaderboardViewed("algotime");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (value: string) => {
    const newType = value as LeaderboardType;
    setLeaderboardType(newType);
    setPage(1);
    setSearch("");
    trackLeaderboardTabSwitched(newType);
    trackLeaderboardViewed(newType);
  };



  // ─── Competition data loading ──────────────────────────────────────────────
  // AlgoTime data is managed entirely inside AlgoTimeCard.
  const loadCompetitions = useCallback(async () => {
    if (leaderboardType !== "competition") return;

    try {
      setLoading(true);
      setError(null);

      const [currentStandings, pageData] = await Promise.all([
        getCurrentCompetitionLeaderboard(user?.id),
        getCompetitionsDetails({
          currentUserId: user?.id,
          search,
          sort: sortAsc ? "asc" : "desc",
          page,
          pageSize: COMPETITION_PAGE_SIZE,
        }),
      ]);

      if (
        currentStandings.competitionName !== "No Active Competition" &&
        currentStandings.participants.length > 0
      ) {
        const current: CompetitionWithParticipants = {
          id: 0,
          competitionTitle: currentStandings.competitionName,
          date: new Date(),
          participants: currentStandings.participants,
          showSeparator: currentStandings.showSeparator,
        };
        setCurrentCompetition(current);
        setCompetitions(
          pageData.competitions.filter(
            (c) => c.competitionTitle !== current.competitionTitle
          )
        );
      } else {
        setCurrentCompetition(null);
        setCompetitions(pageData.competitions);
      }

      setCompetitionsPage(pageData);
    } catch (err) {
      console.error("Error loading competitions:", err);
      setError("Failed to load competitions");
    } finally {
      setLoading(false);
    }
  }, [leaderboardType, user?.id, search, sortAsc, page]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  // Refresh the current competition leaderboard every minute while the tab is active
  useEffect(() => {
    if (leaderboardType !== "competition") return;
    const id = setInterval(loadCompetitions, 60_000);
    return () => clearInterval(id);
  }, [leaderboardType, loadCompetitions]);

  // ─── Event handlers ────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (value.trim()) trackLeaderboardSearched(value.trim());
  };

  const handleSortChange = (newSortAsc: boolean) => {
    setSortAsc(newSortAsc);
    setPage(1);
    trackLeaderboardSortChanged(newSortAsc ? "asc" : "desc");
  };

  const totalPages = competitionsPage
    ? Math.ceil(competitionsPage.total / COMPETITION_PAGE_SIZE)
    : 1;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 w-full max-w-full px-4 space-y-4">
      <div className="mb-4 flex items-center justify-start">
        <Tabs value={leaderboardType} onValueChange={handleTabChange}>
          <TabsList className="h-10 rounded-xl border border-border/70 bg-muted p-1 backdrop-blur-sm">
            <TabsTrigger
              value="algotime"
              className="min-w-30 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              data-cy="leaderboard-algotime"
            >
              AlgoTime
            </TabsTrigger>
            <TabsTrigger
              value="competition"
              className="min-w-30 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              data-cy="leaderboard-competitions"
            >
              Competitions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {leaderboardType === "competition" && (
        loading ? (
          <>
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-10 flex-1 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            ))}
          </>
        ) : (
          <SearchAndFilterBar
            search={search}
            setSearch={handleSearchChange}
            sortAsc={sortAsc}
            setSortAsc={handleSortChange}
          />
        )
      )}



      {error && (
        <div className="text-center py-8 text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      {!loading && !error && leaderboardType === "competition" && (
        <>
          {currentCompetition && (
            <div className="border-3 border-primary rounded-lg p-4 bg-primary/15">
              <h2 className="text-lg font-semibold text-primary mb-3">
                Current Competition
              </h2>
              <CompetitionCard
                competition={currentCompetition}
                isCurrent={true}
                currentUserId={user?.id}
              />
            </div>
          )}

          {competitions.length > 0 && (
            <>
              {currentCompetition && (
                <h2 className="text-lg font-semibold text-foreground mt-4">
                  Past Competitions
                </h2>
              )}
              {competitions.map((comp) => (
                <CompetitionCard
                  key={comp.id}
                  competition={comp}
                  currentUserId={user?.id}
                />
              ))}
            </>
          )}

          {competitions.length === 0 && !currentCompetition && (
            <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-lg border border-border">
              {search ? "No competitions match your search" : "No competitions found"}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* AlgoTimeCard is self-contained: it owns its own data fetching, pagination,
          and search state. Leaderboards.tsx only passes the user identity. */}
      {leaderboardType === "algotime" && (
        <AlgoTimeCard currentUserId={user?.id} />
      )}
    </div>
  );
}

export default Leaderboards;