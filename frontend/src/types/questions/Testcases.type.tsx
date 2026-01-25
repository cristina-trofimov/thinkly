export type TestcaseType = {
    test_case_id: number,
    question_id: number,
    input_data: Record<string, unknown>,
    // input_data: string,
    expected_output: string,
    caseID: string,
}