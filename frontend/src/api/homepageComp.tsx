import axiosClient from "@/lib/axiosClient";
import type {CompetitionItem} from "@/types/CompetitionItem";
import { config } from "../config";


  export async function getCompetitions(): Promise<CompetitionItem[]>{
    try {
        const response = await axiosClient.get<{
            id: number;
            competitionTitle: string; 
            date: string;
        }[]>(`${config.backendUrl}/competitions`);

        const formatted: CompetitionItem[] = response.data.map(c => ({
            id: c.id,
            competitionTitle: c.competitionTitle,
            date: new Date(c.date),
          }));
      
          return formatted;
        } catch (err) {
          console.error("Error fetching competitions:", err);
          throw err;
        }
  }
