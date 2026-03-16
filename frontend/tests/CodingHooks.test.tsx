import { renderHook, waitFor, act } from '@testing-library/react'
import { useCodingHooks } from '../src/components/helpers/CodingHooks'
import { getEventByName } from '../src/api/BaseEventAPI'
import { getAllQuestionInstancesByEventID, getQuestionInstance, putQuestionInstance } from '../src/api/QuestionInstanceAPI'
import { getAllLanguages } from '../src/api/LanguageAPI'
import { getProfile } from '../src/api/AuthAPI'
import { getUserPrefs } from '../src/api/UserPreferencesAPI'
import { getQuestionByID } from '../src/api/QuestionsAPI'
import { getUserInstance, putUserInstance } from '../src/api/UserQuestionInstanceAPI'
import { toast } from 'sonner'
import { logFrontend } from '../src/api/LoggerAPI'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { Question, TagResponse, TestCase } from '../src/types/questions/QuestionPagination.type'
import { Competition } from '../src/types/competition/Competition.type'
import { BaseEvent } from '../src/types/BaseEvent.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/api/BaseEventAPI', () => ({ getEventByName: jest.fn() }))
jest.mock('../src/api/QuestionInstanceAPI', () => ({
  getQuestionInstance: jest.fn(),
  getAllQuestionInstancesByEventID: jest.fn(),
  putQuestionInstance: jest.fn(),
}))
jest.mock('../src/api/LanguageAPI', () => ({ getAllLanguages: jest.fn() }))
jest.mock('../src/api/AuthAPI', () => ({ getProfile: jest.fn() }))
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

const mockLanguages = [
  { lang_judge_id: 71, display_name: 'Python', monaco_id: 'python', active: true },
  { lang_judge_id: 62, display_name: 'Java', monaco_id: 'java', active: true },
]

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

const mockedGetEventByName = getEventByName as jest.Mock
const mockedGetAllQIByEvent = getAllQuestionInstancesByEventID as jest.Mock
const mockedGetQuestionInstance = getQuestionInstance as jest.Mock
const mockedPutQuestionInstance = putQuestionInstance as jest.Mock
const mockedGetAllLanguages = getAllLanguages as jest.Mock
const mockedGetProfile = getProfile as jest.Mock
const mockedGetUserPrefs = getUserPrefs as jest.Mock
const mockedGetQuestionByID = getQuestionByID as jest.Mock
const mockedGetUserInstance = getUserInstance as jest.Mock
const mockedPutUserInstance = putUserInstance as jest.Mock
const mockedUseTestcases = useTestcases as jest.Mock

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockedUseTestcases.mockReturnValue({ testcases: [] })
  mockedGetProfile.mockResolvedValue(mockProfile)
  mockedGetAllLanguages.mockResolvedValue(mockLanguages)
  mockedGetUserPrefs.mockResolvedValue(null)
  mockedGetUserInstance.mockResolvedValue(mockUQI)
  mockedPutUserInstance.mockResolvedValue(mockUQI)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCodingHooks — initial state', () => {
  it('returns expected initial values', () => {
    mockedGetQuestionInstance.mockResolvedValue(null)
    mockedPutQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks())

    expect(result.current.isQuestionLoading).toBe(false)
    expect(result.current.isAsyncLoading).toBe(false)
    expect(result.current.activeQuestion).toBeUndefined()
    expect(result.current.activeQuestionInstance).toBeUndefined()
    expect(result.current.questions).toEqual([])
    expect(result.current.questionsInstances).toEqual([])
    expect(result.current.mostRecentSub).toBeUndefined()
    expect(result.current.event).toBeNull()
    expect(result.current.loadingMsg).toBe('')
  })

  it('returns setter functions', () => {
    const { result } = renderHook(() => useCodingHooks())
    expect(typeof result.current.setActiveQuestion).toBe('function')
    expect(typeof result.current.setSelectedLang).toBe('function')
    expect(typeof result.current.setMostRecentSub).toBe('function')
    expect(typeof result.current.setIsAsyncLoading).toBe('function')
    expect(typeof result.current.setLoadingMsg).toBe('function')
  })
})

describe('useCodingHooks — practice mode (no event)', () => {
  it('fetches question instance when question is provided', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(1)
    )
    expect(mockedGetQuestionInstance).toHaveBeenCalledWith(1, null)
    expect(result.current.questionsInstances[0]).toEqual(mockQI)
  })

  it('creates a question instance via putQuestionInstance when none exists', async () => {
    mockedGetQuestionInstance.mockResolvedValue(null)
    mockedPutQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(1)
    )
    expect(mockedPutQuestionInstance).toHaveBeenCalledWith(
      undefined, mockQuestion.question_id, null, null
    )
  })

  it('sets activeQuestion to the first question', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.activeQuestion).toEqual(mockQuestion)
    )
  })

  it('sets activeQuestionInstance to the first instance', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.activeQuestionInstance).toEqual(mockQI)
    )
  })

  it('sets isQuestionLoading to false after fetch completes', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.isQuestionLoading).toBe(false)
    )
  })

  it('shows toast and logs when getQuestionInstance throws', async () => {
    mockedGetQuestionInstance.mockRejectedValue(new Error('fetch error'))

    renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching question instance.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('does not fetch when question is undefined', () => {
    renderHook(() => useCodingHooks(undefined))
    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
  })
})

describe('useCodingHooks — competition mode (with event)', () => {
  it('fetches event when comp is provided', async () => {
    mockedGetEventByName.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI])

    renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(mockedGetEventByName).toHaveBeenCalledWith(mockComp.competitionTitle)
    )
  })

  it('fetches all question instances by event ID after event loads', async () => {
    mockedGetEventByName.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID.mockResolvedValue(mockQuestion)

    const { result } = renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(result.current.questionsInstances).toHaveLength(2)
    )
    expect(mockedGetAllQIByEvent).toHaveBeenCalledWith(mockEvent.event_id)
  })

  it('fetches all question details when event has multiple instances', async () => {
    mockedGetEventByName.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID
      .mockResolvedValueOnce(mockQuestion)
      .mockResolvedValueOnce(mockQuestion2)

    const { result } = renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(result.current.questions).toHaveLength(2)
    )
    expect(mockedGetQuestionByID).toHaveBeenCalledWith(mockQI.question_id)
    expect(mockedGetQuestionByID).toHaveBeenCalledWith(mockQI2.question_id)
  })

  it('sets the event in state', async () => {
    mockedGetEventByName.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI])

    const { result } = renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(result.current.event).toEqual(mockEvent)
    )
  })

  it('shows toast and logs when getEventByName throws', async () => {
    mockedGetEventByName.mockRejectedValue(new Error('event error'))

    renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching competition event.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('shows toast and logs when getAllQuestionInstancesByEventID throws', async () => {
    mockedGetEventByName.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockRejectedValue(new Error('instances error'))

    renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Error when fetching event's question instances.")
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('shows toast and logs when getQuestionByID throws', async () => {
    mockedGetEventByName.mockResolvedValue(mockEvent)
    mockedGetAllQIByEvent.mockResolvedValue([mockQI, mockQI2])
    mockedGetQuestionByID.mockRejectedValue(new Error('question fetch error'))

    renderHook(() => useCodingHooks(mockQuestion, mockComp))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching questions.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )
  })

  it('does not fetch comp event when comp has no id', () => {
    renderHook(() => useCodingHooks(mockQuestion, { ...mockComp, id: undefined as any }))
    expect(mockedGetEventByName).not.toHaveBeenCalled()
  })
})

describe('useCodingHooks — language and preferences', () => {
  it('loads languages and user preferences', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue(mockUserPrefs)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.languages).toEqual(mockLanguages)
    )
    expect(mockedGetAllLanguages).toHaveBeenCalledWith(true)
    expect(mockedGetUserPrefs).toHaveBeenCalledWith(mockProfile.id)
  })

  it('sets selectedLang from last used language in preferences', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue(mockUserPrefs) // last_used = 71 = Python

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.selectedLang?.lang_judge_id).toBe(71)
    )
  })

  it('falls back to first language when no preference set', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue(null)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(result.current.selectedLang?.lang_judge_id).toBe(71)
    )
  })

  it('falls back to first language when preferred lang_judge_id not found', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetUserPrefs.mockResolvedValue({ ...mockUserPrefs, last_used_programming_language: 999 })

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      // 999 not in languages, so selectedLang stays undefined (no match)
      expect(result.current.languages).toEqual(mockLanguages)
    )
  })

  it('shows toast and logs when language loading fails', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    mockedGetProfile.mockRejectedValueOnce(new Error('auth error'))

    const onUnhandledRejection = jest.fn()
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error when fetching languages.')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodingHooks' })
    )

    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  })
})

describe('useCodingHooks — user question instance', () => {
  it('fetches user question instance when activeQuestionInstance is set', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

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

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

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

describe('useCodingHooks — mostRecentSubGroupClass', () => {
  it('defaults to 2-column grid when no mostRecentSub', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() => expect(result.current.isQuestionLoading).toBe(false))
    expect(result.current.mostRecentSubGroupClass).toBe('grid grid-cols-2 gap-4')
  })

  it('switches to 3-column grid when mostRecentSub is set', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() => expect(result.current.isQuestionLoading).toBe(false))

    act(() => {
      result.current.setMostRecentSub({
        row_id: 1,
        user_question_instance_id: 123,
        code: 'print(1)',
        submitted_on: new Date(),
        lang_judge_id: 71,
      })
    })

    await waitFor(() =>
      expect(result.current.mostRecentSubGroupClass).toBe('grid grid-cols-3 gap-2')
    )
  })

  it('reverts to 2-column grid when mostRecentSub is cleared', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)

    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    await waitFor(() => expect(result.current.isQuestionLoading).toBe(false))

    act(() => {
      result.current.setMostRecentSub({
        row_id: 1,
        user_question_instance_id: 123,
        code: 'print(1)',
        submitted_on: new Date(),
        lang_judge_id: 71,
      })
    })

    await waitFor(() =>
      expect(result.current.mostRecentSubGroupClass).toBe('grid grid-cols-3 gap-2')
    )

    act(() => {
      result.current.setMostRecentSub(undefined as any)
    })

    await waitFor(() =>
      expect(result.current.mostRecentSubGroupClass).toBe('grid grid-cols-2 gap-4')
    )
  })
})

describe('useCodingHooks — setters work correctly', () => {
  it('setIsAsyncLoading updates state', async () => {
    mockedGetQuestionInstance.mockResolvedValue(mockQI)
    const { result } = renderHook(() => useCodingHooks(mockQuestion))

    act(() => { result.current.setIsAsyncLoading(true) })
    expect(result.current.isAsyncLoading).toBe(true)

    act(() => { result.current.setIsAsyncLoading(false) })
    expect(result.current.isAsyncLoading).toBe(false)
  })

  it('setLoadingMsg updates state', async () => {
    const { result } = renderHook(() => useCodingHooks())

    act(() => { result.current.setLoadingMsg('Submitting') })
    expect(result.current.loadingMsg).toBe('Submitting')
  })

  it('setActiveQuestion updates state', async () => {
    const { result } = renderHook(() => useCodingHooks())

    act(() => { result.current.setActiveQuestion(mockQuestion) })
    expect(result.current.activeQuestion).toEqual(mockQuestion)
  })

  it('setSelectedLang updates state', async () => {
    const { result } = renderHook(() => useCodingHooks())

    act(() => { result.current.setSelectedLang(mockLanguages[0] as any) })
    expect(result.current.selectedLang).toEqual(mockLanguages[0])
  })
})