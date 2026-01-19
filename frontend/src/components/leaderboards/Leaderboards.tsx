"use client";

import { useState, useEffect } from "react";
import { Trophy, Clock } from "lucide-react";
import { CompetitionCard } from "./CompetitionCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { getCompetitionsDetails, getCurrentCompetitionLeaderboard, getAllAlgoTimeEntries } from "@/api/LeaderboardsAPI";
import { getProfile } from "@/api/AuthAPI";

type LeaderboardType = "competition" | "algotime";

interface AlgoTimeEntry {
  entryId: number;
  algoTimeSeriesId: number;
  name: string;
  userId: number | null;
  totalScore: number;
  problemsSolved: number;
  totalTime: number;
  rank: number;
  lastUpdated: string;
}

export function Leaderboards() {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("competition");
  const [competitions, setCompetitions] = useState<CompetitionWithParticipants[]>([]);
  const [currentCompetition, setCurrentCompetition] = useState<CompetitionWithParticipants | null>(null);
  const [algoTimeEntries, setAlgoTimeEntries] = useState<AlgoTimeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const profile = await getProfile();
        console.log("Current user profile:", profile);
        setCurrentUserId(profile.id);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        // If user is not logged in, continue without user ID
        setCurrentUserId(undefined);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const loadLeaderboards = async () => {
      try {
        setLoading(true);
        setError(null);

        if (leaderboardType === "competition") {
          console.log("Loading competitions with user ID:", currentUserId);
          // Load all competitions with current user ID
          const allCompetitions = await getCompetitionsDetails(currentUserId);
          console.log("Loaded competitions:", allCompetitions);

          // Load current competition using getCurrentLeaderboardStandings
          const currentStandings = await getCurrentCompetitionLeaderboard(currentUserId);
          console.log("Current standings:", currentStandings);

          if (currentStandings.competitionName !== "No Active Competition" && currentStandings.participants.length > 0) {
            const current: CompetitionWithParticipants = {
              id: 0, // We don't have ID from getCurrentLeaderboardStandings
              competitionTitle: currentStandings.competitionName,
              date: new Date(), // Current date for ongoing competition
              participants: currentStandings.participants,
              showSeparator: currentStandings.showSeparator,
            };
            setCurrentCompetition(current);

            // Filter out current competition from the list by name
            setCompetitions(allCompetitions.filter(c => c.competitionTitle !== current.competitionTitle));
          } else {
            setCurrentCompetition(null);
            setCompetitions(allCompetitions);
          }
        } else {
          // Load AlgoTime entries
          const entries = await getAllAlgoTimeEntries();
          setAlgoTimeEntries(entries);
        }
      } catch (err) {
        console.error("Error loading leaderboards:", err);
        setError("Failed to load leaderboards");
      } finally {
        setLoading(false);
      }
    };

    // Only load leaderboards once we have attempted to fetch user ID
    if (currentUserId !== undefined || currentUserId === undefined) {
      loadLeaderboards();
    }
  }, [leaderboardType, currentUserId]);

  const filteredCompetitions = competitions
    .filter((c) => c.competitionTitle?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortAsc
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  // Group AlgoTime entries by series
  const groupedAlgoTime = algoTimeEntries.reduce((acc, entry) => {
    if (!acc[entry.algoTimeSeriesId]) {
      acc[entry.algoTimeSeriesId] = [];
    }
    acc[entry.algoTimeSeriesId].push(entry);
    return acc;
  }, {} as Record<number, AlgoTimeEntry[]>);

  return (
    <div className="flex flex-col w-[calc(100vw-var(--sidebar-width)-3rem)] ml-[1rem] space-y-4">
      {/* Toggle between Competition and AlgoTime */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 w-fit">
        <button
          onClick={() => setLeaderboardType("competition")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            leaderboardType === "competition"
              ? "bg-[#8065CD] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Trophy className="w-4 h-4" />
          Competitions
        </button>
        <button
          onClick={() => setLeaderboardType("algotime")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            leaderboardType === "algotime"
              ? "bg-[#8065CD] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          AlgoTime
        </button>
      </div>

      <SearchAndFilterBar
        search={search}
        setSearch={setSearch}
        sortAsc={sortAsc}
        setSortAsc={setSortAsc}
      />

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
          {/* Current Competition - Highlighted */}
          {currentCompetition && (
            <div className="border-4 border-[#8065CD] rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-[#8065CD]" />
                <h2 className="text-lg font-bold text-[#8065CD]">Current Competition</h2>
              </div>
              <CompetitionCard competition={currentCompetition} isCurrent={true} currentUserId={currentUserId} />
            </div>
          )}

          {/* Past Competitions */}
          {filteredCompetitions.length > 0 && (
            <>
              {currentCompetition && (
                <h2 className="text-lg font-semibold text-gray-700 mt-4">Past Competitions</h2>
              )}
              {filteredCompetitions.map((comp) => (
                <CompetitionCard key={comp.id} competition={comp} currentUserId={currentUserId} />
              ))}
            </>
          )}

          {filteredCompetitions.length === 0 && !currentCompetition && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              {search ? "No competitions match your search" : "No competitions found"}
            </div>
          )}
        </>
      )}

      {!loading && !error && leaderboardType === "algotime" && (
        <>
          {Object.keys(groupedAlgoTime).length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              No AlgoTime sessions found
            </div>
          )}
          {Object.entries(groupedAlgoTime).map(([seriesId, entries]) => (
            <CompetitionCard
              key={seriesId}
              competition={{
                id: parseInt(seriesId),
                competitionTitle: `AlgoTime Series ${seriesId}`,
                date: new Date(entries[0].lastUpdated),
                participants: entries.map(e => ({
                  name: e.name,
                  user_id: e.userId || 0,
                  total_score: e.totalScore,
                  problems_solved: e.problemsSolved,
                  rank: e.rank,
                  total_time: e.totalTime.toString(),
                })),
              }}
              currentUserId={currentUserId}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default Leaderboards;