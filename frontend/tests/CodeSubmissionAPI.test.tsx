import axiosClient from "../src/lib/axiosClient"
import { submitToJudge0 } from "../src/api/Judge0API"
import { getAllSubmissions, submitAttempt } from "../src/api/CodeSubmissionAPI"
import type { TestcaseType } from "../src/types/questions/Testcases.type"
import type { MostRecentSub } from "../src/types/MostRecentSub.type"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"
import { UserPreferences } from "../src/types/UserPreferences.type"
import { SubmissionType } from "../src/types/SubmissionType.type"
import { logFrontend } from "../src/api/LoggerAPI"

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

jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn()
}))

jest.mock('../src/api/Judge0API', () => ({
  submitToJudge0: jest.fn()
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const mockedLogger = logFrontend as jest.Mock
const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>

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

const mockUserPrefs: UserPreferences = {
  pref_id: 1,
  user_id: user_id,
  theme: "light",
  notifications_enabled: false,
  last_used_programming_language: null
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
  mostRecentSubResponse: mockMostRecentSubResponse,
  userPrefs: mockUserPrefs
}

const mockQuestionInstances: QuestionInstance[] = [{
  question_instance_id: question_instance_id,
  question_id: question_id,
  event_id: event_id,
  riddle_id: null,
}]

const mockSubmissions: SubmissionType[] = [{
  submission_id: 456,
  user_id: user_id,
  question_instance_id: question_instance_id,
  status: "Accepted",
  memory: 1024,
  runtime: 0.123,
  submitted_on: "2026-02-22T19:30:00.000Z",
  stdout: "Hello\n",
  stderr: null,
  compile_output: null,
  message: null
}]

const mockSubmissionResponse = {
  codeRunResponse: {
    judge0Response: mockJudge0Response,
    mostRecentSubResponse: mockMostRecentSubResponse
  },
  submissionResponse: {
    status_code: 200,
    data: mockSubmissions
  },
  questionInstance: mockQuestionInstances[0],
}


describe("Code Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockedSubmitToJudge0.mockResolvedValue(mockJudge0Response)
    mockedAxios.post.mockResolvedValue({ data: mockSubmissionResponse })
  })

  it("processes submission not linked to an event (practice question)", async () => {
    await submitAttempt(mockQuestionInstances[0], user_id, undefined, source_code, language_id, testcases)

    // Skip point calculations steps

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedSubmitToJudge0).toHaveBeenCalledWith(user_id, question_instance_id, source_code, language_id, testcases)
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/attempts/add",
      expect.objectContaining({
        user_id: user_id,
        question_instance_id: mockQuestionInstances[0].question_instance_id,
        status: mockJudge0Response.judge0Response.status.description,
        memory: mockJudge0Response.judge0Response.memory,
        runtime: mockJudge0Response.judge0Response.time,
      })
    )
  })

  it("processes submission linked to an event", async () => {
    await submitAttempt(mockQuestionInstances[0], user_id, event_id, source_code, language_id, testcases)

    // Point calculations steps

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedSubmitToJudge0).toHaveBeenCalledWith(user_id, question_instance_id, source_code, language_id, testcases)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/attempts/add",
      expect.objectContaining({
        user_id: user_id,
        question_instance_id: mockQuestionInstances[0].question_instance_id,
        status: mockJudge0Response.judge0Response.status.description,
        memory: mockJudge0Response.judge0Response.memory,
        runtime: mockJudge0Response.judge0Response.time,
      })
    )
  })

  it("submitAttempt: throws an error if the given question instance is undefined", async () => {
    await expect(submitAttempt(undefined, user_id, undefined, source_code, language_id, testcases))
                .rejects.toThrow("SubmitAttempt: Question instance cannot be undefined")
    expect(mockedSubmitToJudge0).not.toHaveBeenCalled()
    expect(mockedAxios.post).not.toHaveBeenCalled()
    // Skip point calculations steps
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "CodeSubmissionAPI",
      })
    );
  })

  it("getAllSubmissions: throws an error if the given question instance is undefined", async () => {
    await expect(getAllSubmissions(user_id, undefined))
                .rejects.toThrow("getAllSubmissions: Question instance cannot be undefined")
    expect(mockedAxios.get).not.toHaveBeenCalled()
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "CodeSubmissionAPI",
      })
    );
  })

  it("handles errors from Judge0 API", async () => {
    mockedSubmitToJudge0.mockRejectedValueOnce(new Error("Judge0 API error"))

    await expect(submitAttempt(mockQuestionInstances[0], user_id, undefined, source_code, language_id, testcases))
                .rejects.toThrow("Judge0 API error")

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).not.toHaveBeenCalled()
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "CodeSubmissionAPI",
      })
    )
  })

  it("handles errors from submission API", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Submission API error"))

    await expect(submitAttempt(mockQuestionInstances[0], user_id, undefined, source_code, language_id, testcases))
                .rejects.toThrow("Submission API error")

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "CodeSubmissionAPI",
      })
    );
  })

  it("gets all submissions given a user id and question instance id", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockSubmissions }})

    await getAllSubmissions(user_id, question_instance_id)
    
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/attempts/all", { params: {
        user_id: user_id,
        question_instance_id: question_instance_id,
      }}
    )
  })

  it("handles errors from getAllSubmission", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"))

    await expect(getAllSubmissions(user_id, question_instance_id))
                .rejects.toThrow("Network error")

    expect(mockedAxios.get).toHaveBeenCalled()
    expect(mockedLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "ERROR",
        component: "CodeSubmissionAPI",
      })
    );
  })
})
