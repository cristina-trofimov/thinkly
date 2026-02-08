import axiosClient from "@/lib/axiosClient";
import type { Question } from "../types/questions/Question.type";
import type { Riddle } from "../types/riddle/Riddle.type";
import type { TestcaseType } from "@/types/questions/Testcases.type";

export async function getQuestions(): Promise<Question[]> {
  try {
    const response = await axiosClient.get<{
      question_id: number;
      question_name: string;
      question_description: string;
      media: string;
      preset_code: string;
      template_solution: string;
      difficulty: "Easy" | "Medium" | "Hard",
      last_modified_at: string;
    }[]>(`/questions/get-all-questions`);

    const formatted: Question[] = response.data.map(q => ({
      id: q.question_id,
      title: q.question_name,
      description: q.question_description,
      media: q.media,
      preset_code: q.preset_code,
      template_solution: q.template_solution,
      difficulty: q.difficulty,
      date: new Date(q.last_modified_at),
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}

export async function deleteQuestions(questionIds: number[]): Promise<{
  status_code: number;
  deleted_count: number;
  deleted_questions: Array<{ question_id: number }>;
  total_requested: number;
  errors?: Array<{ question_id: number; error: string }>;
}> {
  try {
    const response = await axiosClient.delete(`/questions/batch-delete`, {
      data: { question_ids: questionIds },
    });
    console.log(`Questions ${questionIds.join(", ")} deleted successfully`);
    return response.data;
  } catch (err) {
    console.error("Error deleting questions:", err);
    throw err;
  }
}

export async function getRiddles(): Promise<Riddle[]> {
  try {
    const response = await axiosClient.get<{
      riddle_file: string | null;
      riddle_id: number;
      riddle_question: string;
      riddle_answer: string;
    }[]>(`/questions/get-all-riddles`);

    const formatted: Riddle[] = response.data.map(q => ({
      id: q.riddle_id,
      question: q.riddle_question,
      answer: q.riddle_answer,
      file: q.riddle_file || null,
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}

export async function getTestcases(question_id: number): Promise<TestcaseType[]> {
  try {
      const response = await axiosClient.get<{
          test_case_id: number,
          question_id: number,
          input_data: string,
          expected_output: string,
          caseID: string,
      }[]>(`/questions/get-all-testcases/${question_id}`);

      const formatted: TestcaseType[] = response.data.map(t => ({
          test_case_id: t.test_case_id,
          question_id: t.question_id,
          input_data: JSON.parse(t.input_data),
          expected_output: t.expected_output,
          caseID: `Case ${response.data.indexOf(t) + 1}`,
      }));

      return formatted;
    } catch (err) {
      console.error("Error fetching testcases:", err);
      throw err;
    }
}

export async function deleteCompetition(competitionId: string): Promise<void> {
  try {
    await axiosClient.delete(`/competitions/delete-competition/${competitionId}`);
    console.log(`Competition ${competitionId} deleted successfully`);
  } catch (err) {
    console.error("Error deleting competition:", err);
    throw err;
  }
}

export async function uploadQuestions(questions: Question[]): Promise<void> {
  try {
    await axiosClient.post(`/questions/upload-question-batch`, questions);
    console.log(`Questions uploaded successfully`);
  } catch (err) {
    console.error("Error uploading questions:", err);
    throw err;
  }
}
