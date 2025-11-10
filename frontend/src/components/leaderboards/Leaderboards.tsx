"use client";

import { useState, useEffect } from "react";
import { CompetitionCard } from "./CompetitionCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";
import { config } from '../../config';

type Competitor = {
  name: string;
  points: number;
  problemsSolved: number;
  totalTime: string;
};

export type Competition = {
  id: string;
  name: string;
  date: string;
  participants: Competitor[];
};

export function Leaderboards(){
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  // Fetch from FastAPI backend
useEffect(() => {
  fetch(config.backendUrl + "/leaderboards/", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Important for cookies/JWT
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => setCompetitions(data))
    .catch((err) => console.error("Error loading leaderboards:", err));
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

      {filteredCompetitions.map((comp) => (
        <CompetitionCard key={comp.id} competition={comp} />
      ))}
    </div>
  );
}

export default Leaderboards
