import axiosClient from "@/lib/axiosClient";
import type {Questions} from "../components/HomePageQuestions/questionsColumns";
import { config } from "../config";

export async function getQuestions(): Promise<Questions[]> {
    try {
      const response = await axiosClient.get<{
        id: number;
        questionTitle: string;
        date: string;
        difficulty: "Easy" | "Medium" | "Hard";
      }[]>(`${config.backendUrl}/homepage/get-questions`);
  
      const formatted: Questions[] = response.data.map(q => ({
        id: String(q.id),
        questionTitle: q.questionTitle,
        date: new Date(q.date),
        difficulty: q.difficulty,
      }));
  
      return formatted;
    } catch (err) {
      console.error("Error fetching questions:", err);
      throw err;
    }
  }