import axiosClient from "../src/lib/axiosClient"
import { parse_input_output, submitToJudge0 } from "../src/api/Judge0API"
import { updateLastProgLang } from "../src/api/UserPreferencesAPI"
import { logFrontend } from "../src/api/LoggerAPI"
import { getTestCasesByQuestionId } from "../src/api/QuestionsAPI"
import { TestCase } from "../src/types/questions/QuestionPagination.type";

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

jest.mock('../src/api/UserPreferencesAPI', () => ({
  updateLastProgLang: jest.fn()
}))

jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn()
}))

jest.mock('../src/api/QuestionsAPI', () => ({
  getTestCasesByQuestionId: jest.fn()
}))

// AuthAPI mock removed — userId is now passed directly, not fetched internally

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const mockedLogger = logFrontend as jest.Mock
const mockedGetTestCases = getTestCasesByQuestionId as jest.Mock

const code = "print('Hello')";
const language_id = 71
const user_id = 1;

const question_instance_id = 1;
const question_id = 1;
const testcases: TestCase[] = [
  {
    test_case_id: 1,
    question_id: 1,
    input_data: {
      "nums": [2, 7, 11, 15],
      "target": 19
      },
    expected_output: "[1,2]",
  },
  {
    test_case_id: 2,
    question_id: 1,
    input_data: {
      "nums": [2, 7],
      "target": 9
      },
    expected_output: "[0,1]",
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
    mockedGetTestCases.mockResolvedValueOnce(testcases)

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        source_code: code,
        language_id: language_id,
        submissions: testcases,
       },
    })

    await submitToJudge0(question_instance_id, question_id, code, language_id, user_id);

    expect(mockedGetTestCases).toHaveBeenCalledWith(question_id)
    expect(updateLastProgLang).toHaveBeenCalledWith(user_id, language_id)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it("throws error if axios fails", async () => {
    mockedGetTestCases.mockResolvedValueOnce(testcases)
    mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));
    await expect(submitToJudge0(question_instance_id, question_id, code, language_id, user_id))
      .rejects.toThrow("Network error")
  })

  it("throws an error if the given question instance id is undefined", async () => {
    await expect(submitToJudge0(undefined, question_id, code, language_id, user_id))
                .rejects.toThrow("RunCode: Question instance or language cannot be undefined")
    expect(updateLastProgLang).not.toHaveBeenCalled()
    expect(mockedAxios.post).not.toHaveBeenCalled()
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "Judge0API",
      })
    );
  })

  it("throws an error if the given language is undefined", async () => {
    await expect(submitToJudge0(question_instance_id, question_id, code, undefined, user_id))
                .rejects.toThrow("RunCode: Question instance or language cannot be undefined")
    expect(updateLastProgLang).not.toHaveBeenCalled()
    expect(mockedAxios.post).not.toHaveBeenCalled()
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "Judge0API",
      })
    );
  })
})
