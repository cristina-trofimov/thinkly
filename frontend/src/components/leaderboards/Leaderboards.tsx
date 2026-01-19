"use client";

import { useState, useEffect } from "react";
import { Trophy, Clock } from "lucide-react";
import { CompetitionCard } from "./CompetitionCard";
import { AlgoTimeCard } from "./AlgoTimeCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { getCompetitionsDetails, getCurrentCompetitionLeaderboard, getAllAlgoTimeEntries } from "@/api/LeaderboardsAPI";
import { getProfile } from "@/api/AuthAPI";
import type { Participant } from "@/types/account/Participant.type.tsx"
type LeaderboardType = "competition" | "algotime";

export function Leaderboards() {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("competition");
  const [competitions, setCompetitions] = useState<CompetitionWithParticipants[]>([]);
  const [currentCompetition, setCurrentCompetition] = useState<CompetitionWithParticipants | null>(null);
  const [algoTimeEntries, setAlgoTimeEntries] = useState<Participant[]>([]);
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
        setCurrentUserId(profile.id);
      } catch (err) {
        console.error("Error fetching user profile:", err);
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
          const allCompetitions = await getCompetitionsDetails(currentUserId);
          const currentStandings = await getCurrentCompetitionLeaderboard(currentUserId);

          if (currentStandings.competitionName !== "No Active Competition" && currentStandings.participants.length > 0) {
            const current: CompetitionWithParticipants = {
              id: 0,
              competitionTitle: currentStandings.competitionName,
              date: new Date(),
              participants: currentStandings.participants,
              showSeparator: currentStandings.showSeparator,
            };
            setCurrentCompetition(current);

            setCompetitions(allCompetitions.filter(c => c.competitionTitle !== current.competitionTitle));
          } else {
            setCurrentCompetition(null);
            setCompetitions(allCompetitions);
          }
        } else {
          // Fetch the single AlgoTime table
          const entries = await getAllAlgoTimeEntries();
          const participants = entries.map((e) => ({
            entryId: e.entryId,
            name: e.name,
            user_id: e.user_id || 0,
            total_score: e.total_score,
            problems_solved: e.problems_solved,
            total_time: e.total_time,
            rank: e.rank
          }));

          setAlgoTimeEntries(participants);
        }
      } catch (err) {
        console.error("Error loading leaderboards:", err);
        setError("Failed to load leaderboards");
      } finally {
        setLoading(false);
      }
    };

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

      {leaderboardType === "competition" && (
        <SearchAndFilterBar
          search={search}
          setSearch={setSearch}
          sortAsc={sortAsc}
          setSortAsc={setSortAsc}
        />
      )}

      {loading && <div className="text-center py-8 text-gray-600">Loading leaderboards...</div>}
      {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg border border-red-200">{error}</div>}

      {!loading && !error && leaderboardType === "competition" && (
        <>
          {currentCompetition && (
            <div className="border-4 border-[#8065CD] rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-[#8065CD] mb-3">Current Competition</h2>
              <CompetitionCard competition={currentCompetition} isCurrent={true} currentUserId={currentUserId} />
            </div>
          )}

          {filteredCompetitions.length > 0 && (
            <>
              {currentCompetition && <h2 className="text-lg font-semibold text-gray-700 mt-4">Past Competitions</h2>}
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
          {algoTimeEntries.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              No AlgoTime entries found
            </div>
          )}
          {algoTimeEntries.length > 0 && (
            <AlgoTimeCard
              participants={algoTimeEntries}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Leaderboards;