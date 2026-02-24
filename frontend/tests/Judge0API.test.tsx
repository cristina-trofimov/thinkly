import axiosClient from "../src/lib/axiosClient"
import { parse_input_output, submitToJudge0 } from "../src/api/Judge0API"
import type { TestcaseType } from "../src/types/questions/Testcases.type";
import { updateMostRecentSub } from "../src/api/MostRecentSubAPI";
import type { MostRecentSub } from "../src/types/MostRecentSub.type";

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))

jest.mock('../src/api/MostRecentSubAPI', () => ({
  updateMostRecentSub: jest.fn()
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const code = "print('Hello')";
const language_id = "71";
const user_id = 1;
const question_instance_id = 1;
const testcases: TestcaseType[] = [
  {
    test_case_id: 1,
    question_id: 1,
    input_data: {
      "nums": [2, 7, 11, 15],
      "target": 19
      },
    expected_output: "[1,2]",
    caseID: 'Case 1'
  },
  {
    test_case_id: 2,
    question_id: 1,
    input_data: {
      "nums": [2, 7],
      "target": 9
      },
    expected_output: "[0,1]",
    caseID: 'Case 2'
  },
]

describe("Judge0API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("properly parses stdin and expected outputs", async () => {
    const { stdin, expected_output } = parse_input_output(testcases)

    expect(stdin).toEqual("[2,7,11,15] 19\n[2,7] 9\n")
    expect(expected_output).toEqual('[1,2]\n[0,1]\n')
  })

  it("submit to judge0 and returns final output", async () => {
    const { stdin, expected_output } = parse_input_output(testcases)
    
    mockedAxios.post.mockResolvedValueOnce({
      data: { 
        source_code: code,
        language_id: language_id,
        stdin: stdin,
        expected_output: expected_output,
       },
    })

    await submitToJudge0(user_id, question_instance_id, code, language_id, []);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it("throws error if axios fails", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));
    await expect(submitToJudge0(user_id, question_instance_id, code, language_id, testcases))
      .rejects.toThrow("Network error")
  })
})
