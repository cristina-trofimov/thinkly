import axiosClient from "@/lib/axiosClient";
import type { Questions } from "../components/questionsTable/questionsColumns";
import { BACKEND_URL } from "../config";

export async function getQuestions(): Promise<Questions[]> {
  try {
    const response = await axiosClient.get<{
      question_id: number;
      question_name: string;
      last_modified_at: string;
      difficulty: "Easy" | "Medium" | "Hard";
    }[]>(`${BACKEND_URL}/questions/get-all-questions`);

    const formatted: Questions[] = response.data.map(q => ({
      id: String(q.question_id),
      questionTitle: q.question_name,
      date: new Date(q.last_modified_at),
      difficulty: q.difficulty,
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}