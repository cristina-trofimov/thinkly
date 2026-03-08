import axiosClient from "@/lib/axiosClient";
import type { EditableQuestionFields, Question } from "../types/questions/Question.type";
import type { Riddle } from "../types/riddle/Riddle.type";
import type { TestcaseType } from "@/types/questions/Testcases.type";

export async function getQuestionByID(questionId: number): Promise<Question> {
  try {
    const response = await axiosClient.get<{
      question_id: number;
      question_name: string;
      question_description: string;
      media: string;
      preset_code: string;
      template_solution: string;
      difficulty: "easy" | "medium" | "hard",
      last_modified_at: string;
      tags: string[];
      from_string_function: string;
      to_string_function: string;
      testcases: Array<[string, string]>;
    }>(`/questions/get-question-by-id/${questionId}`);

    const formatted: Question = {
      id: response.data.question_id,
      title: response.data.question_name,
      description: response.data.question_description,
      media: response.data.media,
      preset_code: response.data.preset_code,
      template_solution: response.data.template_solution,
      difficulty: response.data.difficulty.charAt(0).toUpperCase() + response.data.difficulty.slice(1) as "Easy" | "Medium" | "Hard",
      date: new Date(response.data.last_modified_at),
      from_string_function: response.data.from_string_function,
      to_string_function: response.data.to_string_function,
      tags: response.data.tags,
      testcases: response.data.testcases,
    };
    return formatted;
  } catch (err) {
    console.error(`Error fetching question with id ${questionId}:`, err);
    throw err;
  }
}

export async function getQuestions(): Promise<Question[]> {
  try {
    const response = await axiosClient.get<{
      question_id: number;
      question_name: string;
      question_description: string;
      media: string;
      preset_code: string;
      template_solution: string;
      difficulty: "easy" | "medium" | "hard",
      last_modified_at: string;
      tags: string[];
      from_string_function: string;
      to_string_function: string;
      testcases: Array<[string, string]>;
    }[]>(`/questions/get-all-questions`);

    const formatted: Question[] = response.data.map(q => ({
      id: q.question_id,
      title: q.question_name,
      description: q.question_description,
      media: q.media,
      preset_code: q.preset_code,
      template_solution: q.template_solution,
      difficulty: q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) as "Easy" | "Medium" | "Hard",
      date: new Date(q.last_modified_at),
      from_string_function: q.from_string_function,
      to_string_function: q.to_string_function,
      tags: q.tags,
      testcases: q.testcases,
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

export async function deleteQuestion(questionId: number): Promise<void> {
  await deleteQuestions([questionId]);
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

export async function updateQuestion(questionId: number, updatedFields: EditableQuestionFields): Promise<void> {
  try {
    const response = await axiosClient.put(`/questions/update-question/${questionId}`, updatedFields);
    console.log(response);
    console.log(`Question ${questionId} updated successfully`);
  } catch (err) {
    console.error(`Error updating question ${questionId}:`, err);
    throw err;
  }
}
