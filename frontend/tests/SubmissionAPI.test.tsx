import axiosClient from "../src/lib/axiosClient"
import { getAllSubmissions, saveSubmission } from "../src/api/SubmissionAPI"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"
import { UserPreferences } from "../src/types/account/UserPreferences.type"
import { SubmissionType } from "../src/types/submissions/SubmissionType.type"
import { logFrontend } from "../src/api/LoggerAPI"
import { MostRecentSub } from "../src/types/submissions/MostRecentSub.type"
import { describe } from "node:test"


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

jest.mock('../src/api/UserQuestionInstanceAPI', () => ({
  putUserInstance: jest.fn()
}))

jest.mock('../src/api/MostRecentSubAPI', () => ({
  updateMostRecentSub: jest.fn()
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const mockedLogger = logFrontend as jest.Mock

const question_id = 1
const question_instance_id = 123
const user_question_instance_id = 1234
const user_id = 1
const event_id = 1
const source_code = "print('Hello')"
const language_id = 71

const mostRecentSubResponse: MostRecentSub = {
  row_id: user_id,
  user_question_instance_id: user_question_instance_id,
  code: source_code,
  lang_judge_id: language_id,
  submitted_on: new Date()
}

const userPrefs: UserPreferences = {
  pref_id: 1,
  user_id: user_id,
  theme: "light",
  notifications_enabled: false,
  last_used_programming_language: null
}

const judge0Response = {
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
  mostRecentSubResponse: mostRecentSubResponse,
  userPrefs: userPrefs
}

const questionInstances: QuestionInstance[] = [{
  question_instance_id: question_instance_id,
  question_id: question_id,
  event_id: event_id,
  riddle_id: null
}]

const submissions: SubmissionType[] = [{
  submission_id: 456,
  user_question_instance_id: user_question_instance_id,
  lang_judge_id: language_id,
  status: "Accepted",
  memory: 1024,
  runtime: 0.123,
  submitted_on: new Date(),
  stdout: "Hello\n",
  stderr: null,
  compile_output: null,
  message: null
}]

describe("SubmissionAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllSubmission', () => {
    it("Gets all the submissions of a user's question instance", async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: submissions } })
      await getAllSubmissions(user_question_instance_id)

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/attempts/all",
        { params: { user_question_instance_id: user_question_instance_id } }
      )
      expect(mockedLogger).not.toHaveBeenCalled()
    })

    it("throws an error if the given user question instance is undefined", async () => {
      await expect(getAllSubmissions(undefined))
                  .rejects.toThrow("getAllSubmissions: User's question instance cannot be undefined")
      expect(mockedAxios.get).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmissionAPI",
        })
      );
    })

    it("handles errors from getAllSubmission", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"))
  
      await expect(getAllSubmissions(user_question_instance_id))
                  .rejects.toThrow("Network error")
  
      expect(mockedAxios.get).toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmissionAPI",
        })
      );
    })
  })

  describe("saveSubmission", () => {
    it("calls and passes a given submission to be saved", async () => {
      mockedAxios.post.mockResolvedValue({ data: submissions[0] })

      await saveSubmission(submissions[0])

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/attempts/add",
        expect.objectContaining({
          user_question_instance_id: submissions[0].user_question_instance_id,
          lang_judge_id: submissions[0].lang_judge_id,
        })
      )
      expect(mockedLogger).not.toHaveBeenCalled()
    })

    it("handles error", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"))
  
      await expect(saveSubmission(submissions[0]))
                  .rejects.toThrow("Network error")
  
      expect(mockedAxios.post).toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmissionAPI",
        })
      );
    })
  })
})
