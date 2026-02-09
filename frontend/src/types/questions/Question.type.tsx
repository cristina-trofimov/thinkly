export interface Question {
    id: number;
    title: string;
    description: string;
    media: string | null;
    preset_code: string;
    template_solution: string;
    from_string_function: string;
    to_string_function: string;
    tags: string[];
    testcases: Array<[string, string]>;
    difficulty: "Easy"|"Medium"|"Hard";
    date: Date;
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