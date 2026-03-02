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
  getAllAlgoTimeEntries,
  type CompetitionsPage,
} from "@/api/LeaderboardsAPI";
import { getProfile } from "@/api/AuthAPI";
import type { Participant } from "@/types/account/Participant.type.tsx";
import { useAnalytics } from "@/hooks/useAnalytics";

type LeaderboardType = "competition" | "algotime";

const PAGE_SIZE = 20;

export function Leaderboards() {
  const [leaderboardType, setLeaderboardType] =
    useState<LeaderboardType>("algotime");

  // Competition state
  const [competitions, setCompetitions] = useState<CompetitionWithParticipants[]>([]);
  const [competitionsPage, setCompetitionsPage] = useState<CompetitionsPage | null>(null);
  const [currentCompetition, setCurrentCompetition] =
    useState<CompetitionWithParticipants | null>(null);

  // AlgoTime state
  const [algoTimeEntries, setAlgoTimeEntries] = useState<Participant[]>([]);
  const [algoTimeShowSeparator, setAlgoTimeShowSeparator] = useState(false);

  // Query params — set here, sent to backend (no client-side filtering)
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);

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

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const profile = await getProfile();
        setCurrentUserId(profile.id);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setCurrentUserId(undefined);
      }
    };
    fetchCurrentUser();
  }, []);

  // ─── Data loading ──────────────────────────────────────────────────────────
  // All filtering, sorting, and pagination is delegated to the backend.
  // This effect re-runs whenever any query param or the user ID changes.
  const loadLeaderboards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (leaderboardType === "competition") {
        const [currentStandings, page_data] = await Promise.all([
          getCurrentCompetitionLeaderboard(currentUserId),
          getCompetitionsDetails({
            currentUserId,
            search,
            sort: sortAsc ? "asc" : "desc",
            page,
            pageSize: PAGE_SIZE,
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
          // Exclude the active competition from past competitions (server already
          // filters by date, but deduplicate by title as a safety net)
          setCompetitions(
            page_data.competitions.filter(
              (c) => c.competitionTitle !== current.competitionTitle
            )
          );
        } else {
          setCurrentCompetition(null);
          setCompetitions(page_data.competitions);
        }

        setCompetitionsPage(page_data);
      } else {
        const { entries, showSeparator } = await getAllAlgoTimeEntries(currentUserId);
        setAlgoTimeShowSeparator(showSeparator);
        setAlgoTimeEntries(
          entries.map((e) => ({
            entryId: e.entryId,
            name: e.name,
            user_id: e.user_id,
            total_score: e.total_score,
            problems_solved: e.problems_solved,
            total_time: e.total_time,
            rank: e.rank,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading leaderboards:", err);
      setError("Failed to load leaderboards");
    } finally {
      setLoading(false);
    }
  }, [leaderboardType, currentUserId, search, sortAsc, page]);

  useEffect(() => {
    loadLeaderboards();
  }, [loadLeaderboards]);

  // ─── Event handlers ────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on new search
    if (value.trim()) {
      trackLeaderboardSearched(value.trim());
    }
  };

  const handleSortChange = (newSortAsc: boolean) => {
    setSortAsc(newSortAsc);
    setPage(1); // Reset to first page on sort change
    trackLeaderboardSortChanged(newSortAsc ? "asc" : "desc");
  };

  const totalPages = competitionsPage
    ? Math.ceil(competitionsPage.total / PAGE_SIZE)
    : 1;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 w-full max-w-full px-4 space-y-4">
      {/* Toggle between Competition and AlgoTime */}
      <div className="flex items-center">
        <Tabs value={leaderboardType} onValueChange={handleTabChange}>
          <TabsList className="space-x-1">
            <TabsTrigger
              value="algotime"
              className="rounded-md text-primary"
              data-cy="leaderboard-algotime"
            >
              AlgoTime
            </TabsTrigger>
            <TabsTrigger
              value="competition"
              className="rounded-md text-primary"
              data-cy="leaderboard-competitions"
            >
              Competitions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {leaderboardType === "competition" && (
        <SearchAndFilterBar
          search={search}
          setSearch={handleSearchChange}
          sortAsc={sortAsc}
          setSortAsc={handleSortChange}
        />
      )}

      {loading && (
        <div className="text-center py-8 text-gray-600">
          Loading leaderboards...
        </div>
      )}
      {error && (
        <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && leaderboardType === "competition" && (
        <>
          {currentCompetition && (
            <div className="border-4 border-[#8065CD] rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-[#8065CD] mb-3">
                Current Competition
              </h2>
              <CompetitionCard
                competition={currentCompetition}
                isCurrent={true}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {competitions.length > 0 && (
            <>
              {currentCompetition && (
                <h2 className="text-lg font-semibold text-gray-700 mt-4">
                  Past Competitions
                </h2>
              )}
              {competitions.map((comp) => (
                <CompetitionCard
                  key={comp.id}
                  competition={comp}
                  currentUserId={currentUserId}
                />
              ))}
            </>
          )}

          {competitions.length === 0 && !currentCompetition && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              {search
                ? "No competitions match your search"
                : "No competitions found"}
            </div>
          )}

          {/* Pagination controls — only shown when there is more than one page */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!loading && !error && leaderboardType === "algotime" && (
        <>
          {algoTimeEntries.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              No AlgoTime entries found
            </div>
          )}
          {algoTimeEntries.length > 0 && (
            <AlgoTimeCard
              participants={algoTimeEntries}
              currentUserId={currentUserId}
              showSeparator={algoTimeShowSeparator}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Leaderboards;