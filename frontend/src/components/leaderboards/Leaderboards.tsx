"use client";

import { useState, useEffect } from "react";
import { CompetitionCard } from "./CompetitionCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";
import type { Competition } from "@/types/Competition";
import { getCompetitions } from "@/api/CompetitionAPI";

export function Leaderboards(){
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch from FastAPI backend
  useEffect(() => {
    const getAllCompetitions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getCompetitions();

        setCompetitions(response);
      } catch (err) {
        console.error("Error loading leaderboards:", err);
        setError("Failed to load leaderboards");
      } finally {
        setLoading(false);
      }
    };

    getAllCompetitions();
  }, []);


  const filteredCompetitions = competitions
    .filter((c) => c.competitionTitle.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortAsc
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  return (
    <div className="flex flex-col w-[calc(100vw-var(--sidebar-width)-3rem)] ml-[1rem] space-y-4">
      <SearchAndFilterBar
        search={search}
        setSearch={setSearch}
        sortAsc={sortAsc}
        setSortAsc={setSortAsc}
      />

      {loading && <div>Loading leaderboards...</div>}

      {error && <div className="text-red-500">{error}</div>}

      {!loading && !error && filteredCompetitions.length === 0 && (
        <div>No competitions found</div>
      )}

      {!loading && !error &&
        filteredCompetitions.map((comp) => (
          <CompetitionCard key={comp.id} competition={comp} />
        ))
      }
    </div>
  );
}

export default Leaderboards
