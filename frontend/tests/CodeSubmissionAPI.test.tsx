import axiosClient from "../src/lib/axiosClient"
import { submitToJudge0 } from "../src/api/Judge0API"
import { submitAttempt } from "../src/api/CodeSubmissionAPI"
import type { TestcaseType } from "../src/types/questions/Testcases.type"
import type { MostRecentSub } from "../src/types/MostRecentSub.type"
import { getQuestionInstance, updateQuestionInstance } from "../src/api/QuestionInstanceAPI"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"

beforeAll(() => {
  Object.defineProperty(global, 'import', {
    value: {
      meta: {
        env: {
          VITE_BACKEND_URL: 'http://localhost:8000'
        }
      }
    }
  });
});

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

jest.mock('../src/api/Judge0API', () => ({
  submitToJudge0: jest.fn()
}))

jest.mock('../src/api/QuestionInstanceAPI', () => ({
  getQuestionInstance: jest.fn(),
  updateQuestionInstance: jest.fn(),
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>
const mockedGetQuestionInstance = getQuestionInstance as jest.MockedFunction<typeof getQuestionInstance>
const mockedUpdateQuestionInstance = updateQuestionInstance as jest.MockedFunction<typeof updateQuestionInstance>


const question_id = 1
const question_instance_id = 123
const user_id = 1
const event_id = 1
const source_code = "print('Hello')"
const language_id = "71"
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

const mockMostRecentSubResponse: MostRecentSub = {
  user_id: user_id,
  question_instance_id: question_instance_id,
  code: source_code,
  lang_judge_id: parseInt(language_id)
}

const mockJudge0Response = {
  judge0Response: {
    stdout: "Hello\n",
    stderr: null,
    compile_output: null,
    message: null,
    status: {
      id: 3,
      description: "Accepted"
    },
    memory: "1024",
    time: "0.123",
    token: null
  },
  mostRecentSubResponse: mockMostRecentSubResponse
}

const mockQuestionInstance: QuestionInstance = {
  question_instance_id: question_instance_id,
  question_id: question_id,
  event_id: event_id,
  points: 10,
  riddle_id: null,
  is_riddle_completed: false
}

const mockSubmissionResponse = {
  codeRunResponse: {
    judge0Response: mockJudge0Response,
    mostRecentSubResponse: mockMostRecentSubResponse
  },
  submissionResponse: {
    status_code: 200,
    data: {
      submission_id: 456,
      user_id: user_id,
      question_instance_id: question_instance_id,
      status: "Accepted",
      memory: "1024",
      runtime: "0.123",
      submitted_on: "2026-02-22T19:30:00.000Z",
      stdout: "Hello\n",
      stderr: null,
      compile_output: null,
      message: null
    }
  },
  questionInstance: mockQuestionInstance,
}


describe("Code Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockedSubmitToJudge0.mockResolvedValue(mockJudge0Response)
    mockedGetQuestionInstance.mockResolvedValue([])
    mockedUpdateQuestionInstance.mockResolvedValue(mockQuestionInstance)
    mockedAxios.post.mockResolvedValue({ data: mockSubmissionResponse })
  })

  it("processes submission not linked to an event (practice question)", async () => {
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)

    const result = await submitAttempt(question_id, user_id, null, source_code, language_id, testcases)

    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance.mock.calls[0][0]).toMatchObject({
      question_id: question_id,
      event_id: null,
      points: null,
      riddle_id: null,
      is_riddle_completed: null
    })

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedSubmitToJudge0).toHaveBeenCalledWith(user_id, question_instance_id, source_code, language_id, testcases)
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/attempts/add",
      expect.objectContaining({
        user_id: user_id,
        question_instance_id: mockQuestionInstance.question_instance_id,
        status: mockJudge0Response.judge0Response.status.description,
        memory: mockJudge0Response.judge0Response.memory,
        runtime: mockJudge0Response.judge0Response.time,
      })
    )
  })

  it("processes submission linked to an event with existing question instance", async () => {
    mockedGetQuestionInstance.mockResolvedValueOnce([mockQuestionInstance])
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)

    const result = await submitAttempt(question_id, user_id, event_id, source_code, language_id, testcases)

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    
    expect(mockedGetQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedGetQuestionInstance).toHaveBeenCalledWith(question_id, event_id)
    
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledWith(mockQuestionInstance)
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it("processes submission linked to an event without existing question instance", async () => {
    mockedGetQuestionInstance.mockResolvedValueOnce([])
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)

    const result = await submitAttempt(question_id, user_id, event_id, source_code, language_id, testcases)

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedGetQuestionInstance).toHaveBeenCalledTimes(1)
    
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance.mock.calls[0][0]).toMatchObject({
      question_id: question_id,
      event_id: event_id,
      points: null,
      riddle_id: null,
      is_riddle_completed: null
    })
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it("handles errors from Judge0 API", async () => {
    mockedSubmitToJudge0.mockRejectedValueOnce(new Error("Judge0 API error"))

    await expect(submitAttempt(question_id, user_id, null, source_code, language_id, testcases))
                .rejects.toThrow("Judge0 API error")

    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance).toHaveBeenCalled()
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it("handles errors from submission API", async () => {
    mockedGetQuestionInstance.mockResolvedValueOnce([])
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)
    mockedAxios.post.mockRejectedValueOnce(new Error("Submission API error"))

    await expect(submitAttempt(question_id, user_id, null, source_code, language_id, testcases))
                .rejects.toThrow("Submission API error")

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })
})
