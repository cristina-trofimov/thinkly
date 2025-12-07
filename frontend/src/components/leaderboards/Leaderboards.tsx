"use client";

import { useState, useEffect } from "react";
import { CompetitionCard } from "./CompetitionCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";
import axiosClient from "@/lib/axiosClient";
import type { Competition } from "../interfaces/Competition";

export function Leaderboards(){
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch from FastAPI backend
  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching leaderboards...");
        const response = await axiosClient.get<Competition[]>("/standings/leaderboards/");
        console.log("Leaderboards response:", response.data);

        setCompetitions(response.data);
      } catch (err) {
        console.error("Error loading leaderboards:", err);
        setError("Failed to load leaderboards");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);


  const filteredCompetitions = competitions
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
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
