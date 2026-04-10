import { submitToJudge0 } from "../src/api/Judge0API"
import { saveSubmission } from "../src/api/SubmissionAPI"
import { putUserInstance } from "../src/api/UserQuestionInstanceAPI"
import { updateMostRecentSub } from "../src/api/MostRecentSubAPI"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"
import type { UserQuestionInstance } from "../src/types/submissions/UserQuestionInstance.type"
import { UserPreferences } from "../src/types/account/UserPreferences.type"
import { SubmissionType } from "../src/types/submissions/SubmissionType.type"
import { logFrontend } from "../src/api/LoggerAPI"
import { LanguageSpecificProperties, Question, TagResponse, TestCase } from "../src/types/questions/QuestionPagination.type"
import { MostRecentSub } from "../src/types/submissions/MostRecentSub.type"
import { describe } from "node:test"
import { submitAttempt } from "../src/api/SubmitCodeAPI"
import { BaseEvent } from "../src/types/BaseEvent.type"
import { upsertAlgoTimeLeaderboardEntry, upsertCompetitionLeaderboardEntry } from "../src/api/LeaderboardsAPI"


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

jest.mock('../src/api/SubmissionAPI', () => ({
  getAllSubmissions: jest.fn(),
  saveSubmission: jest.fn()
}))

jest.mock('../src/api/LeaderboardsAPI', () => ({
  upsertAlgoTimeLeaderboardEntry: jest.fn(),
  upsertCompetitionLeaderboardEntry: jest.fn(),
}))

const mockedLogger = logFrontend as jest.Mock
const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>
const mockedPutUserInstance = putUserInstance as jest.MockedFunction<typeof putUserInstance>
const mockedUpdateMostRecentSub = updateMostRecentSub as jest.MockedFunction<typeof updateMostRecentSub>
const mockedSaveSubmission = saveSubmission as jest.MockedFunction<typeof saveSubmission>
const mockedUpsertAlgoTimeLeaderboardEntry = upsertAlgoTimeLeaderboardEntry as jest.MockedFunction<typeof upsertAlgoTimeLeaderboardEntry>
const mockedUpsertCompetitionLeaderboardEntry = upsertCompetitionLeaderboardEntry as jest.MockedFunction<typeof upsertCompetitionLeaderboardEntry>

const question_id = 1
const question_instance_id = 123
const user_question_instance_id = 1234
const user_id = 1
const event_id = 1
const source_code = "print('Hello')"
const language_id = 71

const boilerCode = `boilerBefore\n${source_code}\nboilerAfter`

const event: BaseEvent = {
  event_id: event_id,
  event_name: "some event",
  event_location: null,
  question_cooldown: 34,
  event_start_date: new Date(),
  event_end_date: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
}

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

const question: Question = {
  question_id: question_id,
  question_name: "string",
  question_description: "some randome desc",
  media: null,
  language_specific_properties: [] as Array<LanguageSpecificProperties>,
  tags: [] as TagResponse[],
  test_cases: [] as TestCase[],
  difficulty: "easy",
  created_at: new Date(),
  last_modified_at: new Date()
}

const userQuestionInstance_riddle_not_complete: UserQuestionInstance = {
  user_question_instance_id: user_question_instance_id,
  user_id: user_id,
  question_instance_id: question_instance_id,
  points: null,
  riddle_complete: false,
  lapse_time: 1234,
  attempts: 3
}

const userQuestionInstance_riddle_complete: UserQuestionInstance = {
  user_question_instance_id: user_question_instance_id,
  user_id: user_id,
  question_instance_id: question_instance_id,
  points: null,
  riddle_complete: true,
  lapse_time: 1234,
  attempts: 3
}

const questionInstances: QuestionInstance[] = [
  {
    question_instance_id: question_instance_id,
    question_id: question_id,
    event_id: event_id,
    riddle_id: null
  },
  {
    question_instance_id: question_instance_id,
    question_id: question_id,
    event_id: event_id,
    riddle_id: 4
  }
]

const submission: SubmissionType = {
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
}


describe("Code Submission", () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe("SubmitCodeAPI", () => {
    it("processes submission not linked to an event (practice question)", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      // userId is now the 8th argument
      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_not_complete, undefined,
        boilerCode, source_code, language_id)

      expect(mockedSubmitToJudge0).toHaveBeenCalledWith(
        question_instance_id, question_id, boilerCode, language_id, user_id)
      expect(mockedPutUserInstance).toHaveBeenCalledWith(userQuestionInstance_riddle_not_complete)
      expect(mockedUpdateMostRecentSub).toHaveBeenCalledWith(user_question_instance_id, source_code, language_id)
      expect(saveSubmission).toHaveBeenCalled()
      expect(saveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          user_question_instance_id: user_question_instance_id,
          lang_judge_id: language_id,
          status: judge0Response.judge0Response.status.description
        })
      )
    })

    it("processes submission linked to an event without a riddle", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, event,
        boilerCode, source_code, language_id)

      expect(mockedSubmitToJudge0).toHaveBeenCalledWith(
        question_instance_id, question_id, boilerCode, language_id, user_id)
      expect(mockedPutUserInstance).toHaveBeenCalledWith(expect.objectContaining({ points: 100 }))
      expect(mockedUpdateMostRecentSub).toHaveBeenCalledWith(user_question_instance_id, source_code, language_id)
      expect(saveSubmission).toHaveBeenCalled()
      expect(saveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          user_question_instance_id: user_question_instance_id,
          lang_judge_id: language_id,
          status: judge0Response.judge0Response.status.description
        })
      )
    })

    it("processes submission not linked to an event without completing riddle", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_not_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_not_complete, event,
        boilerCode, source_code, language_id)

      expect(mockedSubmitToJudge0).toHaveBeenCalledWith(
        question_instance_id, question_id, boilerCode, language_id, user_id)
      expect(mockedPutUserInstance).toHaveBeenCalledWith(expect.objectContaining({ points: 100 }))
      expect(mockedUpdateMostRecentSub).toHaveBeenCalledWith(user_question_instance_id, source_code, language_id)
      expect(saveSubmission).toHaveBeenCalled()
      expect(saveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          user_question_instance_id: user_question_instance_id,
          lang_judge_id: language_id,
          status: judge0Response.judge0Response.status.description
        })
      )
    })

    it("processes submission linked to an event after completing riddle", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[1],
        userQuestionInstance_riddle_complete, event,
        boilerCode, source_code, language_id)

      expect(mockedSubmitToJudge0).toHaveBeenCalledWith(
        question_instance_id, question_id, boilerCode, language_id, user_id)
      expect(mockedPutUserInstance).toHaveBeenCalledWith(expect.objectContaining({ points: 100 }))
      expect(mockedUpdateMostRecentSub).toHaveBeenCalledWith(user_question_instance_id, source_code, language_id)
      expect(saveSubmission).toHaveBeenCalled()
      expect(saveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          user_question_instance_id: user_question_instance_id,
          lang_judge_id: language_id,
          status: judge0Response.judge0Response.status.description
        })
      )
    })

    it("fails if submission linked to an event without completing riddle", async () => {
      await expect(submitAttempt(question, questionInstances[1],
              userQuestionInstance_riddle_not_complete,
              event, boilerCode, source_code, language_id))
            .rejects.toThrow("SubmitAttempt: riddle needs to be completed")

      expect(mockedSubmitToJudge0).not.toHaveBeenCalled()
      expect(mockedPutUserInstance).not.toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("throws an error if the given question is undefined", async () => {
      await expect(
        submitAttempt(undefined, questionInstances[0], userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("SubmitAttempt: missing field between (question, question instance, user question instance, or language) cannot be undefined")

      expect(mockedSubmitToJudge0).not.toHaveBeenCalled()
      expect(mockedPutUserInstance).not.toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("throws an error if the given question instance is undefined", async () => {
      await expect(
        submitAttempt(question, undefined, userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("SubmitAttempt: missing field between (question, question instance, user question instance, or language) cannot be undefined")

      expect(mockedSubmitToJudge0).not.toHaveBeenCalled()
      expect(mockedPutUserInstance).not.toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("throws an error if the given user question instance is undefined", async () => {
      await expect(
        submitAttempt(question, questionInstances[0], undefined,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("SubmitAttempt: missing field between (question, question instance, user question instance, or language) cannot be undefined")

      expect(mockedSubmitToJudge0).not.toHaveBeenCalled()
      expect(mockedPutUserInstance).not.toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("throws an error if the given language is undefined", async () => {
      await expect(
        submitAttempt(question, questionInstances[0], userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, undefined))
                .rejects.toThrow("SubmitAttempt: missing field between (question, question instance, user question instance, or language) cannot be undefined")

      expect(mockedSubmitToJudge0).not.toHaveBeenCalled()
      expect(mockedPutUserInstance).not.toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("Handles error from judge0", async () => {
      mockedSubmitToJudge0.mockRejectedValueOnce(new Error("Network error"))

      await expect(
        submitAttempt(question, questionInstances[0], userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("Network error")

      expect(mockedPutUserInstance).not.toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("Handles error from updating user instance", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockRejectedValueOnce(new Error("Network error"))

      await expect(
        submitAttempt(question, questionInstances[0], userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("Network error")

      expect(mockedSubmitToJudge0).toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).not.toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("Handles error from updating most recent submission", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockRejectedValueOnce(new Error("Network error"))

      await expect(
        submitAttempt(question, questionInstances[0], userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("Network error")

      expect(mockedSubmitToJudge0).toHaveBeenCalled()
      expect(mockedPutUserInstance).toHaveBeenCalled()
      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    it("Handles error from saving submission", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockRejectedValueOnce(new Error("Network error"))

      await expect(
        submitAttempt(question, questionInstances[0], userQuestionInstance_riddle_complete,
                    event, boilerCode, source_code, language_id))
                .rejects.toThrow("Network error")

      expect(mockedSubmitToJudge0).toHaveBeenCalled()
      expect(mockedPutUserInstance).toHaveBeenCalled()
      expect(mockedUpdateMostRecentSub).toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "SubmitCodeAPI",
        })
      )
    })

    // -------------------------------------------------------------------------
    // Points calculation — difficulty branches
    // -------------------------------------------------------------------------

    it("assigns 200 points for a medium difficulty accepted submission in an event", async () => {
      const mediumQuestion: Question = { ...question, difficulty: "medium" }
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(mediumQuestion, questionInstances[0],
        userQuestionInstance_riddle_complete, event,
        boilerCode, source_code, language_id)

      expect(mockedPutUserInstance).toHaveBeenCalledWith(
        expect.objectContaining({ points: 200 })
      )
    })

    it("assigns 300 points for a hard difficulty accepted submission in an event", async () => {
      const hardQuestion: Question = { ...question, difficulty: "hard" }
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(hardQuestion, questionInstances[0],
        userQuestionInstance_riddle_complete, event,
        boilerCode, source_code, language_id)

      expect(mockedPutUserInstance).toHaveBeenCalledWith(
        expect.objectContaining({ points: 300 })
      )
    })

    it("throws an error for an invalid difficulty level in an event with an accepted submission", async () => {
      const invalidQuestion: Question = { ...question, difficulty: "legendary" as Question["difficulty"] }
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)

      await expect(
        submitAttempt(invalidQuestion, questionInstances[0],
          userQuestionInstance_riddle_complete, event,
          boilerCode, source_code, language_id)
      ).rejects.toThrow("SubmitAttempt: This is not a valid question difficulty level")

      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: "ERROR", component: "SubmitCodeAPI" })
      )
    })

    it("does not assign points when the submission is not accepted in an event", async () => {
      const rejectedJudge0Response = {
        ...judge0Response,
        judge0Response: {
          ...judge0Response.judge0Response,
          status: { id: 4, description: "Wrong Answer" }
        }
      }
      // Use a fresh copy so mutations from previous tests don't bleed in
      const freshUserQuestionInstance: UserQuestionInstance = { ...userQuestionInstance_riddle_complete, points: null }

      mockedSubmitToJudge0.mockResolvedValue(rejectedJudge0Response)
      mockedPutUserInstance.mockResolvedValue(freshUserQuestionInstance)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        freshUserQuestionInstance, event,
        boilerCode, source_code, language_id)

      // points should remain null — not set by the difficulty switch
      expect(mockedPutUserInstance).toHaveBeenCalledWith(
        expect.objectContaining({ points: null })
      )
    })

    // -------------------------------------------------------------------------
    // Leaderboard routing
    // -------------------------------------------------------------------------

    it("calls upsertAlgoTimeLeaderboardEntry when isAlgoTime is true and event is present", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)
      mockedUpsertAlgoTimeLeaderboardEntry.mockResolvedValue(undefined)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, event,
        boilerCode, source_code, language_id, true)

      expect(mockedUpsertAlgoTimeLeaderboardEntry).toHaveBeenCalledWith(user_id)
      expect(mockedUpsertCompetitionLeaderboardEntry).not.toHaveBeenCalled()
    })

    it("calls upsertCompetitionLeaderboardEntry when isAlgoTime is false and event is present", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)
      mockedUpsertCompetitionLeaderboardEntry.mockResolvedValue(undefined)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, event,
        boilerCode, source_code, language_id, false)

      expect(mockedUpsertCompetitionLeaderboardEntry).toHaveBeenCalledWith(user_id, event_id)
      expect(mockedUpsertAlgoTimeLeaderboardEntry).not.toHaveBeenCalled()
    })

    it("does not call any leaderboard update when event is undefined", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, undefined,
        boilerCode, source_code, language_id, true)

      expect(mockedUpsertAlgoTimeLeaderboardEntry).not.toHaveBeenCalled()
      expect(mockedUpsertCompetitionLeaderboardEntry).not.toHaveBeenCalled()
    })

    it("does not call any leaderboard update when event is null", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, null,
        boilerCode, source_code, language_id, false)

      expect(mockedUpsertAlgoTimeLeaderboardEntry).not.toHaveBeenCalled()
      expect(mockedUpsertCompetitionLeaderboardEntry).not.toHaveBeenCalled()
    })

    it("propagates leaderboard errors and logs them", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedUpsertCompetitionLeaderboardEntry.mockRejectedValueOnce(new Error("Leaderboard error"))

      await expect(
        submitAttempt(question, questionInstances[0],
          userQuestionInstance_riddle_complete, event,
          boilerCode, source_code, language_id, false)
      ).rejects.toThrow("Leaderboard error")

      expect(mockedSaveSubmission).not.toHaveBeenCalled()
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: "ERROR", component: "SubmitCodeAPI" })
      )
    })

    // -------------------------------------------------------------------------
    // runtime / memory parsing — null branches
    // -------------------------------------------------------------------------

    it("saves submission with null runtime and memory when judge0 omits them", async () => {
      const noMetricsResponse = {
        ...judge0Response,
        judge0Response: {
          ...judge0Response.judge0Response,
          time: null,
          memory: null,
        }
      }
      mockedSubmitToJudge0.mockResolvedValue(noMetricsResponse)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, undefined,
        boilerCode, source_code, language_id)

      expect(mockedSaveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({ runtime: null, memory: null })
      )
    })

    it("saves submission with parsed runtime and memory when judge0 provides them", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, undefined,
        boilerCode, source_code, language_id)

      expect(mockedSaveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: Number.parseInt(judge0Response.judge0Response.time),
          memory: Number.parseInt(judge0Response.judge0Response.memory),
        })
      )
    })

    // -------------------------------------------------------------------------
    // Return value shape
    // -------------------------------------------------------------------------

    it("returns the correct response shape on a successful submission", async () => {
      mockedSubmitToJudge0.mockResolvedValue(judge0Response)
      mockedPutUserInstance.mockResolvedValue(userQuestionInstance_riddle_complete)
      mockedUpdateMostRecentSub.mockResolvedValue(mostRecentSubResponse)
      mockedSaveSubmission.mockResolvedValue(submission)

      const result = await submitAttempt(question, questionInstances[0],
        userQuestionInstance_riddle_complete, undefined,
        boilerCode, source_code, language_id)

      expect(result).toEqual({
        codeRunResponse: {
          judge0Response: judge0Response.judge0Response,
          userPrefs: userPrefs,
        },
        submissionResponse: submission,
        mostRecentSubResponse: mostRecentSubResponse,
      })
    })
  })
})