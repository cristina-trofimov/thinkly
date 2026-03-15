import { renderHook, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { getTestcases } from '../src/api/TestCasesAPI'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { LanguageSpecificProperties, Question, TagResponse, TestCase } from '../src/types/questions/QuestionPagination.type'
import { logFrontend } from "../src/api/LoggerAPI"
import { beforeEach, describe } from 'node:test'
import { getProfile } from '../src/api/AuthAPI'
import { getAllLanguages } from '../src/api/LanguageAPI'
import { getAllSubmissions } from '../src/api/SubmissionAPI'
import { Language } from '../src/types/questions/Language.type'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'
import { Account } from '../src/types/account/Account.type'
import { Competition } from '../src/types/competition/Competition.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'
import { BaseEvent } from '../src/types/BaseEvent.type'
import { UserPreferences } from '../src/types/account/UserPreferences.type'
import { getUserPrefs } from '../src/api/UserPreferencesAPI'
import { getEventByName } from '../src/api/BaseEventAPI'
import { useCodingHooks } from '../src/components/helpers/CodingHooks'
import { getAllQuestionInstancesByEventID, getQuestionInstance, putQuestionInstance } from '../src/api/QuestionInstanceAPI'
import { getQuestionByID } from '../src/api/QuestionsAPI'
import { getUserInstance, putUserInstance } from '../src/api/UserQuestionInstanceAPI'

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

jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useState: jest.fn()
}))

jest.mock('../src/api/TestCasesAPI', () => ({
    getTestcases: jest.fn()
}))

jest.mock('../src/components/helpers/useTestcases')

const mockedUseTestcases = useTestcases as jest.Mock
const mockedGetProfile = getProfile as jest.MockedFunction<typeof getProfile>
const mockedGetAllSubmissions = getAllSubmissions as jest.MockedFunction<typeof getAllSubmissions>
const mockedGetAllLanguages = getAllLanguages as jest.MockedFunction<typeof getAllLanguages>
const mockedGetUserPrefs = getUserPrefs as jest.MockedFunction<typeof getUserPrefs>
const mockedGetEventByName = getEventByName as jest.MockedFunction<typeof getEventByName>
const mockedGetAllQuestionInstancesByEventID = getAllQuestionInstancesByEventID as jest.MockedFunction<typeof getAllQuestionInstancesByEventID>
const mockedGetQuestionInstance = getQuestionInstance as jest.MockedFunction<typeof getQuestionInstance>
const mockedPutQuestionInstance = putQuestionInstance as jest.MockedFunction<typeof putQuestionInstance>as jest.Mock
const mockedGetQuestionByID = getQuestionByID as jest.MockedFunction<typeof getQuestionByID>
const mockedGetUserInstance = getUserInstance as jest.MockedFunction<typeof getUserInstance>
const mockedPutUserInstance = putUserInstance as jest.MockedFunction<typeof putUserInstance>

const user_id = 1
const event_id = 1
const question_id = 1
const user_question_instance_id = 123
const language_id = 123
const testcases = [
  {
    test_case_id: 1,
    question_id: 1,
    input_data: {
      a: 10,
      b: 20,
    },
    expected_output: "12"
  },
  {
    test_case_id: 2,
    question_id: 1,
    input_data: {
      x: 5,
      y: 5,
    },
    expected_output: "123"
  },
  {
    test_case_id: 3,
    question_id: 1,
    input_data: {
      k: "kjb"
    },
    expected_output: "12df"
  },
]

const profile: Account = {
    id: user_id,
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    accountType: "Participant"
}

const userPrefs: UserPreferences = {
    pref_id: 1,
    user_id: user_id,
    theme: "light",
    notifications_enabled: true,
    last_used_programming_language: null
}

const comp: Competition = {
    id: 1,
    competitionTitle: "comp",
    competitionLocation: '',
    startDate: new Date(),
    endDate: new Date()
}

const compEvent: BaseEvent = {
    event_id: 1,
    event_name: "comp",
    event_location: null,
    question_cooldown: 23,
    event_start_date: new Date(),
    event_end_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
}

const algoEvent: BaseEvent = {
    event_id: 2,
    event_name: "algo",
    event_location: null,
    question_cooldown: 23,
    event_start_date: new Date(),
    event_end_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
}

const submissions: SubmissionType[] = [
    {
      submission_id: 1,
      user_question_instance_id: user_question_instance_id,
      lang_judge_id: language_id,
      compile_output: null,
      status: "Accepted",
      runtime: 123,
      memory: 456,
      submitted_on: new Date(2024, 5, 12),
      stdout: "output",
      stderr: null,
      message: null,
    },
    {
      submission_id: 2,
      user_question_instance_id: user_question_instance_id,
      lang_judge_id: 51,
      compile_output: "error",
      status: "Wrong Answer",
      runtime: 45,
      memory: 128,
      submitted_on: new Date(2024, 5, 11),
      stdout: null,
      stderr: "error",
      message: "test failed",
    }
]

const languages: Language[] = [
  {
    row_id: 1,
    lang_judge_id: 71,
    display_name: "Python",
    monaco_id: "python",
    active: true
  },
  {
    row_id: 2,
    lang_judge_id: 51,
    display_name: "Java",
    monaco_id: "java",
    active: false
  },
]

const questions: Question[] = [
  {
    question_id: question_id,
    question_name: "competition",
    question_description: "knckdmvkdmvkdm",
    media: null,
    language_specific_properties: [] as Array<LanguageSpecificProperties>,
    tags: [] as TagResponse[],
    test_cases: [] as Array<TestCase>,
    difficulty: "easy",
    created_at: new Date(),
    last_modified_at: new Date()
  },
  {
    question_id: 2,
    question_name: "djcndkv",
    question_description: "jvkedfkwmq",
    media: null,
    language_specific_properties: [] as Array<LanguageSpecificProperties>,
    tags: [] as TagResponse[],
    test_cases: [] as Array<TestCase>,
    difficulty: "easy",
    created_at: new Date(),
    last_modified_at: new Date()
  },
]

const questionInstances_with_event: QuestionInstance[] = [
  {
    question_instance_id: 1,
    question_id: question_id,
    event_id: event_id,
    riddle_id: null
  },
  {
    question_instance_id: 2,
    question_id: 2,
    event_id: 2,
    riddle_id: null
  },
]

const questionInstances_no_event: QuestionInstance[] = [
  {
    question_instance_id: 1,
    question_id: question_id,
    event_id: null,
    riddle_id: null
  },
  {
    question_instance_id: 2,
    question_id: 2,
    event_id: null,
    riddle_id: null
  },
]

describe('CodingHooks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mock implementations
        mockedUseTestcases.mockReturnValue({
            testcases: testcases,
            loading: false,
        });
    
        mockedGetProfile.mockResolvedValue(profile)
        mockedGetAllSubmissions.mockResolvedValue(submissions)
        mockedGetAllLanguages.mockResolvedValue(languages)
        mockedGetUserPrefs.mockResolvedValue(userPrefs)
    });

  it("doesn't fetches anything if no event or question is passed", async () => {
    renderHook(() => useCodingHooks(undefined, undefined))

    expect(mockedGetEventByName).not.toHaveBeenCalled()
    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
    expect(mockedGetAllQuestionInstancesByEventID).not.toHaveBeenCalled()
    expect(mockedPutQuestionInstance).not.toHaveBeenCalled()
    expect(mockedGetQuestionByID).not.toHaveBeenCalled()
    expect(mockedGetAllLanguages).not.toHaveBeenCalled()
    expect(mockedGetUserPrefs).not.toHaveBeenCalled()
    expect(mockedGetProfile).not.toHaveBeenCalled()
    expect(mockedGetUserInstance).not.toHaveBeenCalled()
    expect(mockedPutUserInstance).not.toHaveBeenCalled()
  })

  describe("A question is passed", () => {
    it("doesn't fetch an event, but get existing question instance", async () => {
        mockedGetQuestionInstance.mockResolvedValue(questionInstances_no_event[0])

        renderHook(() => useCodingHooks(questions[0]))
    
        expect(mockedGetEventByName).not.toHaveBeenCalled()
        expect(mockedGetQuestionInstance).toHaveBeenCalled()
        expect(mockedGetAllQuestionInstancesByEventID).not.toHaveBeenCalled()
        expect(mockedPutQuestionInstance).not.toHaveBeenCalled()
        expect(mockedGetQuestionByID).not.toHaveBeenCalled()
        expect(mockedGetAllLanguages).not.toHaveBeenCalled()
        expect(mockedGetUserPrefs).not.toHaveBeenCalled()
        expect(mockedGetProfile).not.toHaveBeenCalled()
        expect(mockedGetUserInstance).not.toHaveBeenCalled()
        expect(mockedPutUserInstance).not.toHaveBeenCalled()
    })

    it("doesn't fetch an event, but creates question instance", async () => {
        mockedGetQuestionInstance.mockResolvedValue(null)
        mockedPutQuestionInstance.mockResolvedValue(questionInstances_no_event[0])

        renderHook(() => useCodingHooks(questions[0]))
    
        expect(mockedGetEventByName).not.toHaveBeenCalled()
        expect(mockedGetQuestionInstance).toHaveBeenCalled()
        expect(mockedGetAllQuestionInstancesByEventID).not.toHaveBeenCalled()
        expect(mockedPutQuestionInstance).toHaveBeenCalled()
        // expect(mockedGetQuestionByID).not.toHaveBeenCalled()
        // expect(mockedGetAllLanguages).not.toHaveBeenCalled()
        // expect(mockedGetUserPrefs).not.toHaveBeenCalled()
        // expect(mockedGetProfile).not.toHaveBeenCalled()
        // expect(mockedGetUserInstance).not.toHaveBeenCalled()
        // expect(mockedPutUserInstance).not.toHaveBeenCalled()
    })

    it("throws an error if getting question instance fails", async () => {
        mockedGetQuestionInstance.mockRejectedValueOnce(new Error("Network Error"))
        mockedPutQuestionInstance.mockResolvedValue(questionInstances_no_event[0])

        await expect(renderHook(() => useCodingHooks(questions[0])))
            .rejects.toThrow("Network error")
    
        expect(mockedGetEventByName).not.toHaveBeenCalled()
        expect(mockedGetQuestionInstance).toHaveBeenCalled()
        expect(mockedGetAllQuestionInstancesByEventID).not.toHaveBeenCalled()
        expect(mockedPutQuestionInstance).not.toHaveBeenCalled()
        // expect(mockedGetQuestionByID).not.toHaveBeenCalled()
        // expect(mockedGetAllLanguages).not.toHaveBeenCalled()
        // expect(mockedGetUserPrefs).not.toHaveBeenCalled()
        // expect(mockedGetProfile).not.toHaveBeenCalled()
        // expect(mockedGetUserInstance).not.toHaveBeenCalled()
        // expect(mockedPutUserInstance).not.toHaveBeenCalled()
    })
  })


//   describe("an event is passed",)
})
