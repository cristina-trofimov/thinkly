import axiosClient from "@/lib/axiosClient";
import type {Questions} from "../components/HomePageQuestions/questionsColumns";
import { config } from "../config";

export async function getQuestions(): Promise<Questions[]> {
    try {
      const response = await axiosClient.get<{
        question_id: number;
        question_name: string;
        question_description: string;
        difficulty: "easy" | "medium" | "hard";
      }[]>(`${config.backendUrl}/questions`);


      const formatted: Questions[] = response.data.map(q => ({
        id: String(q.question_id),
        questionTitle: q.question_name,
        date: new Date(),
        difficulty: formatDifficulty(q.difficulty),
      }));
  
      return formatted;
    } catch (err) {
      console.error("Error fetching questions:", err);
      throw err;
    }
}

function formatDifficulty(difficulty: "easy" | "medium" | "hard"): "Easy" | "Medium" | "Hard" {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1) as "Easy" | "Medium" | "Hard";
}