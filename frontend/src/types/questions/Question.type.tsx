export type TestCase = {
  test_case_id: number;
  question_id: number;
  input_data: any;
  expected_output: any;
}

export type LanguageSpecificProperties = {
  language_id: number;
  question_id: number;
  language_name: string;
  preset_code: string;
  template_solution: string;
  from_json_function: string;
  to_json_function: string;
}

export type Question = {
  question_id: number;
  question_name: string;
  question_description: string;
  media: string | null;
  language_specific_properties?: Array<LanguageSpecificProperties>;
  tags?: string[];
  testcases?: Array<TestCase>;
  difficulty: "Easy" | "Medium" | "Hard";
  created_at: Date;
  last_modified_at: Date;
}

export type EditableTestCaseFields = {
  input_data: string;
  expected_output: string;
}

export type EditableLanguageSpecificProperties = {
  language_name: string;
  preset_code: string;
  template_solution: string;
  from_json_function: string;
  to_json_function: string;
}

export type EditableQuestionFields = {
  question_name: string;
  question_description: string;
  media?: string | null;
  difficulty: "easy" | "medium" | "hard";
  language_specific_properties: Array<EditableLanguageSpecificProperties>;
  tags: string[];
  testcases: Array<EditableTestCaseFields>;
}

export function getQuestionFields(question: Question): EditableQuestionFields {
  return {
    question_name: question.question_name,
    question_description: question.question_description,
    media: question.media,
    difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard",
    language_specific_properties: question.language_specific_properties!.map((prop) => ({
      language_name: prop.language_name,
      preset_code: prop.preset_code,
      template_solution: prop.template_solution,
      from_json_function: prop.from_json_function,
      to_json_function: prop.to_json_function,
    })),
    tags: question.tags!,
    testcases: question.testcases!.map((testcase) => ({
      input_data: testcase.input_data,
      expected_output: testcase.expected_output,
    })),
  };
}
