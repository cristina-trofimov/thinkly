export type TestcaseType = {
    test_case_id: number,
    question_id: number,
    input_data: Record<string, unknown>,
    expected_output: string,
    caseID: string,
}