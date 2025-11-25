import axiosClient from "@/lib/axiosClient";
import type CurrentStandings from "@/types/leaderboards/CurrentStandings";

export async function getCurrentLeaderboardStandings(): Promise<CurrentStandings> {
    const response = await axiosClient.get<CurrentStandings>("/standings/current");
    return response.data;
}
