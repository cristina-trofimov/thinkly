import type { JsonValue } from "./Question.type";

export type TestcaseType = {
    test_case_id: number,
    question_id: number,
    input_data: JsonValue,
    expected_output: JsonValue,
    caseID: string,
}