import axiosClient from "@/lib/axiosClient";
import type { TestCase } from "@/types/questions/QuestionPagination.type";

export async function getTestcases(
  question_id: number,
): Promise<TestCase[]> {
  try {
    const response = await axiosClient.get<
      {
        test_case_id: number;
        question_id: number;
        input_data: unknown;
        expected_output: unknown;
      }[]
    >(`/questions/get-all-testcases/${question_id}`);

    return response.data.map((testcase) => ({
      test_case_id: testcase.test_case_id,
      question_id: testcase.question_id,
      input_data: testcase.input_data,
      expected_output: testcase.expected_output,
    }));
  } catch (err) {
    console.error("Error fetching testcases:", err);
    throw err;
  }
}