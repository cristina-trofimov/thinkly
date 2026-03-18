import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeDescArea from '../src/components/codingPage/CodeDescArea'
import { Question, TagResponse, TestCase } from '../src/types/questions/QuestionPagination.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'
import { useCodingHooks } from '../src/components/helpers/CodingHooks'
import { getAllSubmissions } from '../src/api/SubmissionAPI'
import { getRiddleById } from '../src/api/RiddlesAPI'
import { getAllLanguages } from '../src/api/LanguageAPI'
import { toast } from 'sonner'
import { logFrontend } from '../src/api/LoggerAPI'

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/components/helpers/CodingHooks', () => ({
  useCodingHooks: jest.fn(),
}))

jest.mock('../src/api/SubmissionAPI', () => ({
  getAllSubmissions: jest.fn(),
}))

jest.mock('../src/api/RiddlesAPI', () => ({
  getRiddleById: jest.fn(),
}))

jest.mock('../src/api/LanguageAPI', () => ({
  getAllLanguages: jest.fn(),
}))

jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}))

jest.mock('../src/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackCodingTabSwitched: jest.fn(),
  }),
}))

jest.mock('../src/components/leaderboards/CurrentLeaderboard', () => ({
  CurrentLeaderboard: () => <div data-testid="leaderboard" />,
}))

jest.mock('../src/components/forms/RiddleForm', () => ({
  __esModule: true,
  default: ({ onSolved }: any) => (
    <div data-testid="riddle-form">
      <button data-testid="solve-riddle-btn" onClick={onSolved}>Solve</button>
    </div>
  ),
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const mockQuestion: Question = {
  question_id: 1,
  question_name: 'Two Sum',
  question_description: 'Given an array of integers, return indices.',
  media: null,
  difficulty: 'Easy',
  language_specific_properties: [],
  tags: [] as TagResponse[],
  test_cases: [
    {
      test_case_id: 1,
      question_id: 1,
      input_data: { nums: [2, 7], target: 9 },
      expected_output: '[0,1]',
    },
  ] as TestCase[],
  created_at: new Date('2025-01-01'),
  last_modified_at: new Date('2025-01-01'),
}

const mockQuestionInstance: QuestionInstance = {
  question_instance_id: 123,
  question_id: 1,
  event_id: 1,
  riddle_id: null,
}

const mockQuestionInstanceWithRiddle: QuestionInstance = {
  ...mockQuestionInstance,
  riddle_id: 99,
}

const mockRiddle = {
  id: 99,
  question: 'What has keys but no locks?',
  answer: 'A piano',
}

const mockSubmissions: SubmissionType[] = [
  {
    submission_id: 1,
    user_question_instance_id: 123,
    lang_judge_id: 71,
    compile_output: null,
    status: 'Accepted',
    runtime: 42,
    memory: 1024,
    submitted_on: new Date('2025-03-01T10:00:00Z'),
    stdout: 'Hello',
    stderr: null,
    message: null,
  },
  {
    submission_id: 2,
    user_question_instance_id: 123,
    lang_judge_id: 71,
    compile_output: 'error: syntax',
    status: 'Wrong Answer',
    runtime: null,
    memory: null,
    submitted_on: new Date('2025-02-28T10:00:00Z'),
    stdout: null,
    stderr: 'Traceback...',
    message: 'Wrong answer on test 1',
  },
]

const mockLanguages = [
  { lang_judge_id: 71, display_name: 'Python', monaco_id: 'python', active: true },
]

const mockUserQuestionInstance = {
  user_question_instance_id: 55,
  riddle_complete: true,
  attempts: 3,
  lapse_time: 1000,
}

// ─── Hook mock factory ────────────────────────────────────────────────────────

const makeMockHook = (overrides: Record<string, any> = {}) => ({
  mostRecentSub: null,
  setMostRecentSub: jest.fn(),
  isQuestionLoading: false,
  setIsQuestionLoading: jest.fn(),
  isAsyncLoading: false,
  setIsAsyncLoading: jest.fn(),
  activeQuestion: mockQuestion,
  setActiveQuestion: jest.fn(),
  activeQuestionInstance: mockQuestionInstance,
  setActiveQuestionInstance: jest.fn(),
  activeDisplayQuestionName: 'Question 1',
  setActiveDisplayQuestionName: jest.fn(),
  userQuestionInstance: mockUserQuestionInstance,
  setUserQuestionInstance: jest.fn(),
  questions: [mockQuestion],
  setQuestions: jest.fn(),
  questionsInstances: [mockQuestionInstance],
  setQuestionsInstances: jest.fn(),
  languages: mockLanguages,
  setLanguages: jest.fn(),
  prevLangRef: { current: null },
  mostRecentSubGroupClass: '',
  setMostRecentSubGroupClass: jest.fn(),
  selectedLang: null,
  setSelectedLang: jest.fn(),
  event: null,
  userPreferences: null,
  testcases: mockQuestion.test_cases,
  loadingMsg: '',
  setLoadingMsg: jest.fn(),
  startTime: null,
  ...overrides,
})

const mockedUseCodingHooks = useCodingHooks as jest.Mock
const mockedGetAllSubmissions = getAllSubmissions as jest.Mock
const mockedGetRiddleById = getRiddleById as jest.Mock
const mockedGetAllLanguages = getAllLanguages as jest.Mock

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockedUseCodingHooks.mockReturnValue(makeMockHook())
  mockedGetRiddleById.mockResolvedValue(null)
  mockedGetAllSubmissions.mockResolvedValue([])
  mockedGetAllLanguages.mockResolvedValue(mockLanguages)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CodeDescArea — rendering', () => {
  it('renders nothing when question is undefined', () => {
    const { container } = render(
      <CodeDescArea question={undefined} question_instance={undefined} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders tabs when question is provided', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('tabs-trigger')).toHaveLength(3)
  })

  it('renders Description, Submissions, and Leaderboard tabs', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Submissions')).toBeInTheDocument()
      expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    })
  })

  it('shows description tab content by default', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => {
      expect(screen.getByTestId('tabs-content-description')).toBeInTheDocument()
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.getByText(/Given an array/)).toBeInTheDocument()
    })
  })

  it('renders test case examples in description', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => {
      expect(screen.getByText('Example 1:')).toBeInTheDocument()
      expect(screen.getByText(/\[0,1\]/)).toBeInTheDocument()
    })
  })
})

describe('CodeDescArea — tab switching', () => {
  it('switches to submissions tab when clicked', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))
    expect(screen.getByTestId('tabs-content-submissions')).toBeInTheDocument()
  })

  it('switches to leaderboard tab when clicked', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Leaderboard')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Leaderboard'))
    expect(screen.getByTestId('tabs-content-leaderboard')).toBeInTheDocument()
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument()
  })

  it('switches back to description tab after visiting another', async () => {
    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))
    await userEvent.click(screen.getByText('Description'))
    expect(screen.getByText('Two Sum')).toBeInTheDocument()
  })
})

describe('CodeDescArea — riddle gate', () => {
  it('shows loading spinner when riddle is loading', () => {
    mockedUseCodingHooks.mockReturnValue(makeMockHook({
      userQuestionInstance: { ...mockUserQuestionInstance, riddle_complete: false },
    }))
    // getRiddleById never resolves so isLoadingRiddle stays true
    mockedGetRiddleById.mockReturnValue(new Promise(() => { }))

    render(
      <CodeDescArea
        question={mockQuestion}
        question_instance={mockQuestionInstanceWithRiddle}
      />
    )
    expect(screen.getByText(/loading challenge lock/i)).toBeInTheDocument()
  })

  it('shows riddle form when riddle is loaded and not yet solved', async () => {
    mockedUseCodingHooks.mockReturnValue(makeMockHook({
      userQuestionInstance: { ...mockUserQuestionInstance, riddle_complete: false },
    }))
    mockedGetRiddleById.mockResolvedValue(mockRiddle)

    render(
      <CodeDescArea
        question={mockQuestion}
        question_instance={mockQuestionInstanceWithRiddle}
      />
    )

    await waitFor(() =>
      expect(screen.getByTestId('riddle-form')).toBeInTheDocument()
    )
    expect(screen.getByText(/Two Sum/)).toBeInTheDocument()
  })

  it('shows normal tabs when riddle_complete is true', async () => {
    mockedGetRiddleById.mockResolvedValue(mockRiddle)

    render(
      <CodeDescArea
        question={mockQuestion}
        question_instance={mockQuestionInstanceWithRiddle}
      />
    )

    await waitFor(() =>
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    )
  })

  it('shows normal tabs when riddle_id is null (no riddle)', async () => {
    render(
      <CodeDescArea
        question={mockQuestion}
        question_instance={mockQuestionInstance}
      />
    )
    await waitFor(() =>
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    )
  })

  it('shows toast.error and logs when riddle fails to load', async () => {
    mockedUseCodingHooks.mockReturnValue(makeMockHook({
      userQuestionInstance: { ...mockUserQuestionInstance, riddle_complete: false },
    }))
    mockedGetRiddleById.mockRejectedValue(new Error('Riddle fetch failed'))

    render(
      <CodeDescArea
        question={mockQuestion}
        question_instance={mockQuestionInstanceWithRiddle}
      />
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to load riddle...')
    )
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodeDescArea' })
    )
  })

  it('shows normal view when riddle fails to load (no riddleObject)', async () => {
    mockedUseCodingHooks.mockReturnValue(makeMockHook({
      userQuestionInstance: { ...mockUserQuestionInstance, riddle_complete: false },
    }))
    mockedGetRiddleById.mockRejectedValue(new Error('fail'))

    render(
      <CodeDescArea
        question={mockQuestion}
        question_instance={mockQuestionInstanceWithRiddle}
      />
    )

    // After error, riddleObject stays null so the riddle form is not shown
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.queryByTestId('riddle-form')).not.toBeInTheDocument()
  })
})

describe('CodeDescArea — submissions tab', () => {
  it('shows empty state when no submissions', async () => {
    mockedGetAllSubmissions.mockResolvedValue([])

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() =>
      expect(screen.getByText(/yet to submit/i)).toBeInTheDocument()
    )
  })

  it('renders submission rows when submissions exist', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => {
      expect(screen.getByTestId('submission-1')).toBeInTheDocument()
      expect(screen.getByTestId('submission-2')).toBeInTheDocument()
    })
  })

  it('shows Accepted status in green', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    const accepted = screen.getByText('Accepted')
    expect(accepted).toHaveClass('text-green-500')
  })

  it('shows Wrong Answer status in red', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-2')).toBeInTheDocument())
    const wrongAnswer = screen.getByText('Wrong Answer')
    expect(wrongAnswer).toHaveClass('text-red-500')
  })

  it('shows submission count in footer', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() =>
      expect(screen.getByText(/2 attempts/i)).toBeInTheDocument()
    )
  })

  it('shows singular "attempt" for one submission', async () => {
    mockedGetAllSubmissions.mockResolvedValue([mockSubmissions[0]])

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() =>
      expect(screen.getByText(/1 attempt$/)).toBeInTheDocument()
    )
  })

  it('shows language name from languages list', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)
    mockedGetAllLanguages.mockResolvedValue(mockLanguages)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() =>
      expect(screen.getAllByText('Python').length).toBeGreaterThan(0)
    )
  })
})

describe('CodeDescArea — submission detail view', () => {
  it('opens submission detail when a row is clicked', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))

    expect(screen.getByText('Submission Details')).toBeInTheDocument()
    expect(screen.getByTestId('back-btn')).toBeInTheDocument()
  })

  it('shows runtime and memory in detail view', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))

    expect(screen.getByText(/42 ms/)).toBeInTheDocument()
    expect(screen.getByText(/1024 KB/)).toBeInTheDocument()
  })

  it('shows stdout when present in detail view', async () => {
    mockedGetAllSubmissions.mockResolvedValue([mockSubmissions[0]])

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('shows stderr and compile_output when present', async () => {
    mockedGetAllSubmissions.mockResolvedValue([mockSubmissions[1]])

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument()) // ← 1 not 2
    await userEvent.click(screen.getByTestId('submission-1'))

    expect(screen.getByText('Traceback...')).toBeInTheDocument()
    expect(screen.getByText('error: syntax')).toBeInTheDocument()
    expect(screen.getByText('Wrong answer on test 1')).toBeInTheDocument()
  })

  it('shows "no additional output" message when no output fields', async () => {
    const minimalSub: SubmissionType = {
      ...mockSubmissions[0],
      stdout: null,
      stderr: null,
      compile_output: null,
      message: null,
    }
    mockedGetAllSubmissions.mockResolvedValue([minimalSub])

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))

    expect(screen.getByText(/no additional output/i)).toBeInTheDocument()
  })

  it('goes back to submissions list when back button is clicked', async () => {
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions)

    render(<CodeDescArea question={mockQuestion} question_instance={mockQuestionInstance} />)
    await waitFor(() => expect(screen.getByText('Submissions')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Submissions'))

    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))

    expect(screen.getByTestId('back-btn')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('back-btn'))

    expect(screen.queryByText('Submission Details')).not.toBeInTheDocument()
    expect(screen.getByTestId('submission-1')).toBeInTheDocument()
  })
})