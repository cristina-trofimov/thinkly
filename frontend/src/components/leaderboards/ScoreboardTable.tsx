"use client";
import {NumberCircle} from "@/components/ui/NumberCircle.tsx";

import {
  Hash,
  User,
  Star,
  ListChecks,
  Clock,
} from "lucide-react";

type Participant = {
  name: string;
  points: number;
  problemsSolved: number;
  runningTime: string;
};

interface Props {
  participants: Participant[];
}

export function ScoreboardTable({ participants }: Props) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
            <th className="pb-2">
              <div className="flex gap-1">
                <Hash className="w-4 h-4 text-gray-500" />
                <span>Rank</span>
              </div>
            </th>
            <th className="pb-2">
              <div className="flex gap-1">
                <User className="w-4 h-4 text-gray-500" />
                <span>Name</span>
              </div>
            </th>
            <th className="pb-2">
              <div className="flex gap-1">
                <Star className="w-4 h-4 text-gray-500" />
                <span>Points</span>
              </div>
            </th>
            <th className="pb-2">
              <div className="flex gap-1">
                <ListChecks className="w-4 h-4 text-gray-500" />
                <span>Problems solved</span>
              </div>
            </th>
            <th className="pb-2 ">
              <div className="flex gap-1">
                <Clock  className="w-4 h-4 text-gray-500" />
                <span>Time</span>
              </div>
            </th>
        </tr>
      </thead>
      <tbody>
        {participants.map((p, idx) => (
          <tr
            key={p.name}
            className={`border-b last:border-0 ${
              idx === 0
                ? "bg-yellow-100"
                : idx === 1
                ? "bg-gray-100"
                : idx === 2
                ? "bg-orange-100"
                : ""
            }`}
          >
            <td className="py-2"> <NumberCircle number={idx + 1}/></td>
            <td className="py-2 font-medium">{p.name}</td>
            <td className="py-2">{p.points}</td>
            <td className="py-2">{p.problemsSolved}</td>
            <td className="py-2">{p.runningTime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
