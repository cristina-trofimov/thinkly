import axiosClient from "@/lib/axiosClient";
import type {Questions} from "../components/HomePageQuestions/questionsColumns";
import { config } from "../config";

export async function getQuestions(): Promise<Questions[]> {
    try {
      const response = await axiosClient.get<{
        id: number;
        question_name: string;
        created_at: string;
        difficulty: "easy" | "medium" | "hard";
      }[]>(`${config.backendUrl}/questions`);
  
      const formatted: Questions[] = response.data.map((q, index) => ({
        id: String(index + 1),
        questionTitle: q.question_name,
        date: new Date(q.created_at),
        difficulty: q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) as "Easy" | "Medium" | "Hard",
      }));
  
      return formatted;
    } catch (err) {
      console.error("Error fetching questions:", err);
      throw err;
    }
  }