import type { Question } from "./Question.type";

export type QuestionLanguageSpecificPropertiesResponse = {
  question_id: number;
  language_id: number;
  language_display_name: string;
  preset_code: string;
  template_solution: string;
  from_json_function: string;
  to_json_function: string;
};

export type TestCaseResponse = {
  question_id: number;
  test_case_id: number;
  input_data: any;
  expected_output: any;
}

export type TagResponse = {
  tag_id: number;
  tag_name: string;
}

export type QuestionListItemResponse = {
  question_id: number;
  question_name: string;
  question_description: string;
  media?: string | null;
  difficulty: "easy" | "medium" | "hard" | "Easy" | "Medium" | "Hard";
  language_specific_properties: Array<QuestionLanguageSpecificPropertiesResponse>;
  created_at: string;
  last_modified_at: string;
  tags: TagResponse[];
  test_cases: Array<TestCaseResponse>;
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