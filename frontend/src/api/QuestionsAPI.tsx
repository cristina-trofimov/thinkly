import axiosClient from "@/lib/axiosClient";
import type { Question } from "../types/questions/Question.type";
import type { Riddle } from "../types/riddle/Riddle.type";

export async function getQuestions(): Promise<Question[]> {
  try {
    const response = await axiosClient.get<{
      question_id: number;
      question_name: string;
      difficulty: "Easy" | "Medium" | "Hard",
      last_modified_at: string;
    }[]>(`/questions/get-all-questions`);

    const formatted: Question[] = response.data.map(q => ({
      id: q.question_id,
      title: q.question_name,
      difficulty: q.difficulty,
      date: new Date(q.last_modified_at),
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}

export async function getRiddles(): Promise<Riddle[]> {
  try {
    const response = await axiosClient.get<{
      riddle_id: number;
      riddle_question: string;
      riddle_answer: string;
    }[]>(`/questions/get-all-riddles`);

    const formatted: Riddle[] = response.data.map(q => ({
      id: q.riddle_id,
      question: q.riddle_question,
      answer: q.riddle_answer,
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}