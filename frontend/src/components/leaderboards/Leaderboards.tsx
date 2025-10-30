"use client";

import { useState } from "react";
import { CompetitionCard } from "./CompetitionCard";
import { SearchAndFilterBar } from "./SearchAndFilterBar";

type Competitor = {
  name: string;
  points: number;
  problemsSolved: number;
  runningTime: string;
};

export type Competition = {
  id: string;
  name: string;
  date: string;
  participants: Competitor[];
};

const competitions: Competition[] = [
  {
    id: "1",
    name: "Thinkly October Challenge",
    date: "2025-10-20",
    participants: [
      { name: "Julia Trinh", points: 1560, problemsSolved: 20, runningTime: "20.1 min" },
      { name: "Boudour Bannouri", points: 1540, problemsSolved: 19, runningTime: "22.5 min" },
      { name: "Constance Prevot", points: 1480, problemsSolved: 17, runningTime: "23.4 min" },
      { name: "Oviya Sinnathamby", points: 1300, problemsSolved: 15, runningTime: "24 min" },
      { name: "Midhurshaan Nadarajah", points: 1290, problemsSolved: 15, runningTime: "35 min" },
      { name: "Jackson Amirthalingam", points: 1250, problemsSolved: 15, runningTime: "40.8 min" },
    ],
  },
  {
    id: "2",
    name: "Thinkly September Cup",
    date: "2025-09-10",
    participants: [
      { name: "Alice Brown", points: 1450, problemsSolved: 18, runningTime: "25.1 min" },
      { name: "Carlos Vega", points: 1320, problemsSolved: 16, runningTime: "28.4 min" },
      { name: "Liam Chen", points: 1200, problemsSolved: 14, runningTime: "30.5 min" },
    ],
  },
];

export function Leaderboards(){
    const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

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
