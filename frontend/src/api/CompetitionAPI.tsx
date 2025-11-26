import axiosClient from "@/lib/axiosClient";
import { config } from "../config";
import type { Competition } from "@/types/competition/Competition.type";


export async function getCompetitions(): Promise<Competition[]> {
  try {
    const response = await axiosClient.get<{
      id: number;
      competition_title: string;
      date: Date;
    }[]>(`${config.backendUrl}/homepage/get-competitions`);

    const formatted: Competition[] = response.data.map(c => ({
      id: c.id,
      competitionTitle: c.competition_title,
      date: c.date,
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching competitions:", err);
    throw err;
  }
}
