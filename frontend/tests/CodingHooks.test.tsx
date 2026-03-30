import { renderHook, waitFor, act } from '@testing-library/react'
import { useCodingHooks } from '../src/components/helpers/CodingHooks'
import { getEventByID } from '../src/api/BaseEventAPI'
import { getAllQuestionInstancesByEventID, getQuestionInstance, putQuestionInstance } from '../src/api/QuestionInstanceAPI'
import { getAllLanguages } from '../src/api/LanguageAPI'
import { getUserPrefs } from '../src/api/UserPreferencesAPI'
import { getQuestionByID } from '../src/api/QuestionsAPI'
import { getUserInstance, putUserInstance } from '../src/api/UserQuestionInstanceAPI'
import { toast } from 'sonner'
import { logFrontend } from '../src/api/LoggerAPI'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { Question, TagResponse, TestCase } from '../src/types/questions/QuestionPagination.type'
import { Competition } from '../src/types/competition/Competition.type'
import { AlgoTimeQuestion, AlgoTimeSession } from '../src/types/algoTime/AlgoTime.type'
import { BaseEvent } from '../src/types/BaseEvent.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'
import { UserContext } from '../src/context/UserContext'
import React from 'react'

// ─── Mocks ───────────────────────────────────────────────────────────────────
import { Language } from '../src/types/questions/Language.type'
import { getMostRecentSub } from '../src/api/MostRecentSubAPI'
import { getAllSubmissions } from '../src/api/SubmissionAPI'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'
import { MostRecentSub } from '../src/types/submissions/MostRecentSub.type'

// ─── Mocks ───────────────────────────────────────────────────────────────────
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

jest.mock('../src/api/BaseEventAPI', () => ({ getEventByID: jest.fn() }))
jest.mock('../src/api/QuestionInstanceAPI', () => ({
  getQuestionInstance: jest.fn(),
  getAllQuestionInstancesByEventID: jest.fn(),
  putQuestionInstance: jest.fn(),
}))
jest.mock('../src/api/LanguageAPI', () => ({ getAllLanguages: jest.fn() }))
jest.mock('../src/api/UserPreferencesAPI', () => ({ getUserPrefs: jest.fn() }))
jest.mock('../src/api/QuestionsAPI', () => ({ getQuestionByID: jest.fn() }))
jest.mock('../src/api/UserQuestionInstanceAPI', () => ({
  getUserInstance: jest.fn(),
  putUserInstance: jest.fn(),
}))
jest.mock('../src/api/LoggerAPI', () => ({ logFrontend: jest.fn() }))
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}))
jest.mock('../src/components/helpers/useTestcases', () => ({
  useTestcases: jest.fn(),
}))
jest.mock('../src/api/MostRecentSubAPI', () => ({ getMostRecentSub: jest.fn() }))
jest.mock('../src/api/SubmissionAPI', () => ({ getAllSubmissions: jest.fn() }))

// ─── Test data ────────────────────────────────────────────────────────────────

const mockQuestion: Question = {
  question_id: 1,
  question_name: 'Two Sum',
  question_description: 'Given an array...',
  media: null,
  difficulty: 'Easy',
  language_specific_properties: [],
  tags: [] as TagResponse[],
  test_cases: [] as TestCase[],
  created_at: new Date('2025-01-01'),
  last_modified_at: new Date('2025-01-01'),
}

const mockQuestion2: Question = { ...mockQuestion, question_id: 2, question_name: 'Max Profit' }

const mockComp: Competition = {
  id: 1,
  competitionTitle: 'Spring Contest',
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-01'),
  competitionLocation: 'Online',
}

const mockAlgo: AlgoTimeSession = {
  id: 12,
  eventName: 'Spring Contest',
  startTime: new Date('2026-06-01'),
  endTime: new Date('2026-06-01'),
  questionCooldown: 45,
  seriesId: null,
  seriesName: null,
  questions: [] as AlgoTimeQuestion[]
}

const mockEvent: BaseEvent = {
  event_id: 10,
  event_name: 'Spring Contest',
  event_location: 'Online',
  question_cooldown: 300,
  event_start_date: new Date('2026-06-01'),
  event_end_date: new Date('2026-06-01'),
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
}

const mockQI: QuestionInstance = {
  question_instance_id: 123,
  question_id: 1,
  event_id: 10,
  riddle_id: null,
}

const mockQI2: QuestionInstance = {
  question_instance_id: 456,
  question_id: 2,
  event_id: 10,
  riddle_id: null,
}

const mockLanguages: Language[] = [
  {
    row_id: 1,
    lang_judge_id: 71,
    monaco_id: "python",
    display_name: "Python",
    active: true,
  },
  {
    row_id: 2,
    lang_judge_id: 51,
    monaco_id: "java",
    display_name: "Java",
    active: false,
  },
]

const mockSubmissions: SubmissionType[] = [
  {
    submission_id: 123,
    user_question_instance_id: 55,
    lang_judge_id: 71,
    compile_output: "Hello world",
    status: "Accepted",
    runtime: 1234,
    memory: null,
    submitted_on: new Date(),
    stdout: null,
    stderr: null,
    message: null
  },
  {
    submission_id: 153,
    user_question_instance_id: 55,
    lang_judge_id: 71,
    compile_output: "Hello world",
    status: "Accepted",
    runtime: 124,
    memory: null,
    submitted_on: new Date(),
    stdout: null,
    stderr: null,
    message: null
  }
]

const mockMostRecentSub: MostRecentSub = {
  row_id: 1,
  user_question_instance_id: 55,
  code: "print('hello world')",
  submitted_on: new Date(),
  lang_judge_id: 71
}

const mockProfile = { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', accountType: 'Participant' }

const mockUserPrefs = {
  pref_id: 1,
  user_id: 1,
  theme: 'light',
  notifications_enabled: true,
  last_used_programming_language: 71,
}

const mockUQI = {
  user_question_instance_id: 55,
  user_id: 1,
  question_instance_id: 123,
  points: null,
  riddle_complete: null,
  lapse_time: null,
  attempts: null,
}

const mockedLogger = logFrontend as jest.Mock
const mockedGetEventByID = getEventByID as jest.Mock
const mockedGetAllQIByEvent = getAllQuestionInstancesByEventID as jest.Mock
const mockedGetQuestionInstance = getQuestionInstance as jest.Mock
const mockedPutQuestionInstance = putQuestionInstance as jest.Mock
const mockedGetAllLanguages = getAllLanguages as jest.Mock
const mockedGetUserPrefs = getUserPrefs as jest.Mock
const mockedGetQuestionByID = getQuestionByID as jest.Mock
const mockedGetUserInstance = getUserInstance as jest.Mock
const mockedPutUserInstance = putUserInstance as jest.Mock
const mockedUseTestcases = useTestcases as jest.Mock
const mockedGetMostRecentSub = getMostRecentSub as jest.Mock
const mockedGetAllSubmissions = getAllSubmissions as jest.Mock

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider value={{
    user: mockProfile as any,
    loading: false,
    setUser: jest.fn(),
    refreshUser: jest.fn() as () => Promise<void>,
  }}>
    {children}
  </UserContext.Provider>
)

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockedUseTestcases.mockReturnValue({ testcases: [] })
  mockedGetAllLanguages.mockResolvedValue(mockLanguages)
  mockedGetUserPrefs.mockResolvedValue(null)
  mockedGetUserInstance.mockResolvedValue(mockUQI)
  mockedPutUserInstance.mockResolvedValue(mockUQI)
  mockedGetQuestionByID.mockResolvedValue(mockQuestion)

    // jest.clearAllMocks()
    // mockedUseTestcases.mockReturnValue({ testcases: [] })
    // mockedGetProfile.mockResolvedValue(mockProfile)
    // mockedGetUserPrefs.mockResolvedValue(null)
    // mockedGetUserInstance.mockResolvedValue(mockUQI)
    // mockedPutUserInstance.mockResolvedValue(mockUQI)
    // mockedGetQuestionByID.mockResolvedValue(mockQuestion)  // ← add

})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCodingHooks — initial state', () => {
  it('returns expected initial values', () => {
    mockedGetQuestionInstance.mockResolvedValue(null)
    mockedPutQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.activeQuestion).toBeUndefined()
    expect(result.current.activeQuestionInstance).toBeUndefined()
    expect(result.current.questions).toEqual([])
    expect(result.current.questionsInstances).toEqual([])
    expect(result.current.mostRecentSub).toBeUndefined()
    expect(result.current.event).toBeNull()
    expect(result.current.loadingMsg).toBe('')
  })

  it('returns setter functions', () => {
    const { result } = renderHook(() => useCodingHooks(), { wrapper })
    expect(typeof result.current.setActiveQuestion).toBe('function')
    expect(typeof result.current.setSelectedLang).toBe('function')
    expect(typeof result.current.setMostRecentSub).toBe('function')
    expect(typeof result.current.setIsLoading).toBe('function')
    expect(typeof result.current.setLoadingMsg).toBe('function')
  })
})

describe('useCodingHooks — practice mode (no event)', () => {
  it('fetches question instance when question is provided', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(1)
    )
    expect(mockedGetQuestionInstance).toHaveBeenCalledWith(1, null)
    expect(result.current.questionsInstances[0]).toEqual(mockQI)
  })

  it('creates a question instance via putQuestionInstance when none exists', async () => {
    mockedGetQuestionInstance.mockResolvedValue(null)
    mockedPutQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(1)
    )
    expect(mockedPutQuestionInstance).toHaveBeenCalledWith(
      undefined, mockQuestion.question_id, null, null
    )
  })

  it('sets activeQuestion to the first question', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.activeQuestion).toEqual(mockQuestion)
    )
  })

  it('sets activeQuestionInstance to the first instance', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.activeQuestionInstance).toEqual(mockQI)
    )
  })

  it('sets isQuestionLoading to false after fetch completes', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.isLoading).toBe(false)
    )
  })

  it('shows toast and logs when getQuestionInstance throws', async () => {
    mockedGetQuestionInstance.mockRejectedValue(new Error('fetch error'))

    renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching question instance.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('does not fetch when question is undefined', () => {
    renderHook(() => useCodingHooks(undefined), { wrapper })
    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
  })
})

describe('useCodingHooks — competition mode (with event)', () => {
  it('fetches event when comp is provided', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI])

    renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(mockedGetEventByID).toHaveBeenCalledWith(mockComp.id)
    )
  })

  it('fetches all question instances by event ID after event loads', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID.mockResolvedValue(mockQuestion)

    const { result } = renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(2)
    )
    expect(mockedGetAllQIByEvent).toHaveBeenCalledWith(mockEvent.event_id)
  })

  it('fetches all question details when event has multiple instances', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID
      .mockResolvedValueOnce(mockQuestion)
      .mockResolvedValueOnce(mockQuestion2)

    const { result } = renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(result.current.questions).toHaveLength(2)
    )
    expect(mockedGetQuestionByID).toHaveBeenCalledWith(mockQI.question_id)
    expect(mockedGetQuestionByID).toHaveBeenCalledWith(mockQI2.question_id)
  })

  it('sets the event in state', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI])

    const { result } = renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(result.current.event).toEqual(mockEvent)
    )
  })

  it('shows toast and logs when getEventByID throws', async () => {
    mockedGetEventByID.mockRejectedValue(new Error('event error'))

    renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching event.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('shows toast and logs when getAllQuestionInstancesByEventID throws', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockRejectedValue(new Error('instances error'))

    renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Error when fetching event's question instances.")
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('shows toast and logs when getQuestionByID throws', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID.mockRejectedValue(new Error('question fetch error'))

    renderHook(() => useCodingHooks(mockQuestion, mockComp), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching questions.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('does not fetch comp event when comp has no id', () => {
    renderHook(() => useCodingHooks(mockQuestion, { ...mockComp, id: undefined as any }), { wrapper })
    expect(mockedGetEventByID).not.toHaveBeenCalled()
  })
})


describe('useCodingHooks — algotime mode (with event)', () => {
  it('fetches event when algotime is provided', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI])

    renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(mockedGetEventByID).toHaveBeenCalledWith(mockAlgo.id)
    )
  })

  it('fetches all question instances by event ID after event loads', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID.mockResolvedValue(mockQuestion)

    const { result } = renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(2)
    )
    expect(mockedGetAllQIByEvent).toHaveBeenCalledWith(mockEvent.event_id)
  })

  it('fetches all question details when event has multiple instances', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID
      .mockResolvedValueOnce(mockQuestion)
      .mockResolvedValueOnce(mockQuestion2)

    const { result } = renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(result.current.questions).toHaveLength(2)
    )
    expect(mockedGetQuestionByID).toHaveBeenCalledWith(mockQI.question_id)
    expect(mockedGetQuestionByID).toHaveBeenCalledWith(mockQI2.question_id)
  })

  it('sets the event in state', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI])

    const { result } = renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(result.current.event).toEqual(mockEvent)
    )
  })

  it('shows toast and logs when getEventByID throws', async () => {
    mockedGetEventByID.mockRejectedValue(new Error('event error'))

    renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching event.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('shows toast and logs when getAllQuestionInstancesByEventID throws', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockRejectedValue(new Error('instances error'))

    renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Error when fetching event's question instances.")
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('shows toast and logs when getQuestionByID throws', async () => {
    mockedGetEventByID.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID.mockRejectedValue(new Error('question fetch error'))

    renderHook(() => useCodingHooks(undefined, undefined, mockAlgo), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching questions.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('does not fetch algo event when algotime session has no id', () => {
    renderHook(() => useCodingHooks(undefined, undefined, { ...mockAlgo, id: undefined as any }), { wrapper })
    expect(mockedGetEventByID).not.toHaveBeenCalled()
  })
})

describe('useCodingHooks — language and preferences', () => {
  it('loads active languages and user preferences', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue(mockUserPrefs)
    mockedGetAllLanguages.mockResolvedValue([mockLanguages[0]])

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.languages).toEqual([mockLanguages[0]])
    )
    expect(mockedGetAllLanguages).toHaveBeenCalledWith(true)
    expect(mockedGetUserPrefs).toHaveBeenCalledWith(mockProfile.id)
  })

  it('sets selectedLang from last used language in preferences', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue(mockUserPrefs)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.selectedLang?.lang_judge_id).toBe(71)
    )
  })

  it('falls back to first language when no preference set', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue(null)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.selectedLang?.lang_judge_id).toBe(71)
    )
  })

  it('falls back to first language when preferred lang_judge_id not found', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetAllLanguages.mockResolvedValue([mockLanguages[0]])
    mockedGetUserPrefs.mockResolvedValue({ ...mockUserPrefs, last_used_programming_language: 999 })

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      // 999 not in languages, so selectedLang stays undefined (no match)
      expect(result.current.languages).toEqual([mockLanguages[0]])
    )
  })

  it('shows toast and logs when language loading fails', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetAllLanguages.mockRejectedValueOnce(new Error('language fetch error'))  // ← change this

    renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching languages.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })
})

describe('useCodingHooks — user question instance', () => {
  it('fetches user question instance when activeQuestionInstance is set', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.userQuestionInstance).toEqual(mockUQI)
    )
    expect(mockedGetUserInstance).toHaveBeenCalledWith(
      mockProfile.id,
      mockQI.question_instance_id
    )
  })

  it('creates user question instance via putUserInstance when none exists', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserInstance.mockResolvedValue(null)
    mockedPutUserInstance.mockResolvedValue(mockUQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() =>
      expect(result.current.userQuestionInstance).toEqual(mockUQI)
    )
    expect(mockedPutUserInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockProfile.id,
        question_instance_id: mockQI.question_instance_id,
      })
    )
  })
})

describe('useCodingHooks — LastSteps', () => {
  it("fetches user's last submission if there's any, all submissions and all languages when UserQuestionInstance is set", async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserInstance.mockResolvedValue(mockUQI)
    mockedGetAllLanguages.mockResolvedValue([mockLanguages[1]])
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)
    mockedGetMostRecentSub.mockResolvedValue(mockMostRecentSub)

    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    await waitFor(() => {
      expect(result.current.allLanguages).toEqual([mockLanguages[1]])
      expect(result.current.allSubmissions).toEqual(mockSubmissions)
      expect(result.current.mostRecentSub).toEqual(mockMostRecentSub)
    })
  })
})

describe('useCodingHooks — setters work correctly', () => {
  it('setIsLoading updates state', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    const { result } = renderHook(() => useCodingHooks(mockQuestion), { wrapper })

    act(() => { result.current.setIsLoading(true) })
    expect(result.current.isLoading).toBe(true)

    act(() => { result.current.setIsLoading(false) })
    expect(result.current.isLoading).toBe(false)
  })

  it('setLoadingMsg updates state', async () => {
    const { result } = renderHook(() => useCodingHooks(), { wrapper })

    act(() => { result.current.setLoadingMsg('Submitting') })
    expect(result.current.loadingMsg).toBe('Submitting')
  })

  it('setActiveQuestion updates state', async () => {
    const { result } = renderHook(() => useCodingHooks(), { wrapper })

    act(() => { result.current.setActiveQuestion(mockQuestion) })
    expect(result.current.activeQuestion).toEqual(mockQuestion)
  })

  it('setSelectedLang updates state', async () => {
    const { result } = renderHook(() => useCodingHooks(), { wrapper })

    act(() => { result.current.setSelectedLang(mockLanguages[0] as any) })
    expect(result.current.selectedLang).toEqual(mockLanguages[0])
  })
})
