export interface Question {
  question_id: number;
  question_name: string;
  question_description: string;
  media: string | null;
  preset_code: string | null;
  template_solution: string;
  from_string_function: string;
  to_string_function: string;
  tags?: string[];
  testcases?: Array<[string, string]>;
  difficulty: "Easy" | "Medium" | "Hard";
  created_at: Date;
  last_modified_at: Date;
}

export interface EditableQuestionFields {
  question_name: string;
  question_description: string;
  media: string | null;
  difficulty: "easy" | "medium" | "hard";
  preset_code: string;
  from_string_function: string;
  to_string_function: string;
  template_solution: string;
  tags: string[];
  testcases: Array<[string, string]>;
}

export function getQuestionFields(question: Question): EditableQuestionFields {
  return {
    question_name: question.question_name,
    question_description: question.question_description,
    media: question.media,
    difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard",
    preset_code: question.preset_code ?? "",
    from_string_function: question.from_string_function,
    to_string_function: question.to_string_function,
    template_solution: question.template_solution,
    tags: question.tags ?? [],
    testcases: question.testcases ?? [],
  };
}
