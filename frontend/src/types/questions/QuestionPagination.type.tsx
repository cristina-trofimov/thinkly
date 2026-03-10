import type { Question } from "./Question.type";

export type QuestionListItemResponse = {
  question_id: number;
  question_name: string;
  question_description: string;
  media: string | null;
  preset_code: string | null;
  template_solution: string;
  difficulty: "easy" | "medium" | "hard" | "Easy" | "Medium" | "Hard";
  from_string_function?: string;
  to_string_function?: string;
  created_at?: string;
  last_modified_at: string;
  tags?: string[];
  testcases?: Array<[string, string]>;
};

export type QuestionsResponse = {
  total: number;
  page: number;
  page_size: number;
  items: QuestionListItemResponse[];
};

export type RiddlesResponse = {
  total: number;
  page: number;
  page_size: number;
  items: {
    riddle_file: string | null;
    riddle_id: number;
    riddle_question: string;
    riddle_answer: string;
  }[];
};

export type QuestionsPageParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  difficulty?: "easy" | "medium" | "hard";
  sort?: "asc" | "desc";
};

export type QuestionsPageResult = {
  total: number;
  page: number;
  pageSize: number;
  items: Question[];
};