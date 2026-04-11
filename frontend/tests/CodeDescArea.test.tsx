import React, { createRef } from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeDescArea from '../src/components/codingPage/CodeDescArea'
import { Question, TagResponse, TestCase } from '../src/types/questions/QuestionPagination.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'
import { UserQuestionInstance } from '../src/types/submissions/UserQuestionInstance.type'
import { getRiddleById } from '../src/api/RiddlesAPI'
import { toast } from 'sonner'
import { logFrontend } from '../src/api/LoggerAPI'
import { Language } from '../src/types/questions/Language.type'
import { TooltipProvider } from '@radix-ui/react-tooltip'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// JSDOM does not implement ResizeObserver. Provide a no-op stub so the
// component's useEffect can attach/detach without throwing. Because all JSDOM
// dimensions are 0, the probe check (`probeWidth > 0`) never fires, iconOnly
// stays false, and labels remain in the DOM for all text-based assertions.
// The effect now depends on `tabs.length` (re-runs when switching between 3/4
// tabs) but the stub is stateless so this is safe — observe/disconnect are no-ops.
class ResizeObserverStub {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

jest.mock('react-resizable-panels', () => ({
    __esModule: true,
    PanelGroup: React.forwardRef(({ children }: any, ref: any) => {
        React.useImperativeHandle(ref, () => ({ setLayout: jest.fn() }))
        return <div data-testid="panel-group">{children}</div>
    }),
    Panel: ({ children }: any) => <div data-testid="resizable-panel">{children}</div>,
    PanelResizeHandle: () => <div data-testid="resizable-handle" />,
}))

jest.mock('../src/api/RiddlesAPI', () => ({
  getRiddleById: jest.fn(),
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

jest.mock('../src/components/helpers/CodingHooks', () => ({
  useCodingHooks: jest.fn(() => ({
    setUserQuestionInstance: jest.fn(),
  })),
}))

jest.mock('../src/components/forms/RiddleForm', () => ({
  __esModule: true,
  default: ({ onSolved }: any) => (
    <div data-testid="riddle-form">
      <button data-testid="solve-riddle-btn" onClick={onSolved}>Solve</button>
    </div>
  ),
}))

jest.mock('../src/components/codingPage/SubmissionSkeleton', () => ({
  SubmissionSkeleton: () => <div data-testid="submission-skeleton">Loading skeleton</div>,
}))

// SubmissionDetail is used for both the submissions list detail view AND
// the result tab — mock it with testids so both code paths are testable.
jest.mock('../src/components/codingPage/SubmissionDetail', () => ({
  SubmissionDetail: ({ submission, goBack }: any) => (
    <div data-testid="submission-detail" data-status={submission?.status}>
      <div>Submission Details</div>
      {submission?.runtime && <span>{submission.runtime} ms</span>}
      {submission?.memory && <span>{submission.memory} KB</span>}
      {submission?.stdout && <span>{submission.stdout}</span>}
      {submission?.stderr && <span>{submission.stderr}</span>}
      {submission?.compile_output && <span>{submission.compile_output}</span>}
      {submission?.message && <span>{submission.message}</span>}
      {!submission?.stdout && !submission?.stderr && !submission?.compile_output && !submission?.message && (
        <span>No additional output</span>
      )}
      {goBack && <button data-testid="back-btn" onClick={goBack}>Back</button>}
    </div>
  ),
}))

jest.mock('@/components/leaderboards/CodingPageLeaderboard', () => ({
  EventLeaderboard: () => <div data-testid="mock-event-leaderboard">Mock Event Leaderboard</div>,
}))
jest.mock('../src/components/leaderboards/CodingPageLeaderboard', () => ({
  EventLeaderboard: () => <div data-testid="mock-event-leaderboard">Mock Event Leaderboard</div>,
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const mockTestcases: TestCase[] = [
  {
    test_case_id: 1,
    question_id: 1,
    input_data: { nums: [2, 7], target: 9 },
    expected_output: '[0,1]',
  },
]

const mockQuestion: Question = {
  question_id: 1,
  question_name: 'Two Sum',
  question_description: 'Given an array of integers, return indices.',
  media: null,
  difficulty: 'Easy',
  language_specific_properties: [],
  tags: [] as TagResponse[],
  test_cases: mockTestcases,
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

const mockUqi: UserQuestionInstance = {
  user_question_instance_id: 55,
  user_id: 1,
  question_instance_id: 123,
  riddle_complete: true,
  attempts: 3,
  lapse_time: 1000,
  points: null,
}

const mockUqiRiddleIncomplete: UserQuestionInstance = {
  ...mockUqi,
  riddle_complete: false,
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

const mockLanguages: Language[] = [
  { row_id: 1, lang_judge_id: 71, monaco_id: 'python', display_name: 'Python', active: true },
  { row_id: 2, lang_judge_id: 51, monaco_id: 'java', display_name: 'Java', active: false },
]

const mockRef = createRef<HTMLDivElement>()

// ─── Typed mock references ────────────────────────────────────────────────────

const mockedGetRiddleById = getRiddleById as jest.Mock

// ─── Helper ───────────────────────────────────────────────────────────────────

interface RenderOpts {
  question?: Question | undefined
  question_instance?: QuestionInstance | undefined | null
  uqi?: UserQuestionInstance | undefined | null
  eventId?: number | undefined
  eventName?: string
  isCompetitionEvent?: boolean
  currentUserId?: number
  submissionState?: 'idle' | 'loading' | 'done'
  latestSubmissionResult?: SubmissionType | null
  allLanguages?: Language[]
  submissions?: SubmissionType[]
  onRiddleSolved?: () => void
}

const renderCodeDescArea = (opts: RenderOpts = {}) => render(
  <TooltipProvider>
    <CodeDescArea
      question={'question' in opts ? opts.question : mockQuestion}
      question_instance={'question_instance' in opts ? opts.question_instance : mockQuestionInstance}
      uqi={'uqi' in opts ? opts.uqi : mockUqi}
      eventId={'eventId' in opts ? opts.eventId : 1}
      eventName={opts.eventName ?? 'Test Event'}
      isCompetitionEvent={opts.isCompetitionEvent ?? true}
      currentUserId={opts.currentUserId}
      submissionState={opts.submissionState ?? 'idle'}
      latestSubmissionResult={opts.latestSubmissionResult ?? null}
      allLanguages={opts.allLanguages ?? mockLanguages}
      submissions={opts.submissions ?? mockSubmissions}
      onRiddleSolved={opts.onRiddleSolved}
      ref={mockRef}
    />
  </TooltipProvider>
)

// ─── Tab query helpers ────────────────────────────────────────────────────────
//
// The component renders a hidden probe <div> (aria-hidden, fixed off-screen)
// that duplicates every tab label so the ResizeObserver can measure natural
// widths. This means getByText('Submissions') finds TWO <span> elements and
// throws "Found multiple elements". Scoping queries to the visible TabsList via
// within() avoids the probe entirely and always targets the real tab buttons.

const getTabsList = () => screen.getByTestId('tabs-list')
const withinTabs  = () => within(getTabsList())

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetRiddleById.mockResolvedValue(null)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CodeDescArea — rendering', () => {
  it('renders tabs when question is provided', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs')).toBeInTheDocument())
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
    // with eventId=1: Description, Submissions, Result, Leaderboard = 4
    expect(screen.getAllByTestId('tabs-trigger')).toHaveLength(4)
  })

  it('renders all four tab labels when event is present', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    const tabs = withinTabs()
    expect(tabs.getByText('Description')).toBeInTheDocument()
    expect(tabs.getByText('Submissions')).toBeInTheDocument()
    expect(tabs.getByText('Result')).toBeInTheDocument()
    expect(tabs.getByText('Leaderboard')).toBeInTheDocument()
  })

  it('renders only three tabs when eventId is undefined', async () => {
    renderCodeDescArea({ eventId: undefined })
    await waitFor(() => expect(screen.getByTestId('tabs')).toBeInTheDocument())
    expect(screen.getAllByTestId('tabs-trigger')).toHaveLength(3)
    expect(withinTabs().queryByText('Leaderboard')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tabs-content-leaderboard')).not.toBeInTheDocument()
  })

  // Regression: 3-tab (no-event) layout previously collapsed to icon-only
  // immediately because the useEffect ran once on mount with [] deps and never
  // re-seeded after data loaded. Now tabs.length is a dep so the effect
  // re-runs. In JSDOM all dimensions are 0 so iconOnly stays false and all
  // labels must remain visible.
  it('shows all three tab labels when eventId is undefined (no icon-only collapse)', async () => {
    renderCodeDescArea({ eventId: undefined })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    const tabs = withinTabs()
    expect(tabs.getByText('Description')).toBeInTheDocument()
    expect(tabs.getByText('Submissions')).toBeInTheDocument()
    expect(tabs.getByText('Result')).toBeInTheDocument()
    expect(tabs.queryByText('Leaderboard')).not.toBeInTheDocument()
  })

  // Regression: tabs must fill full bar width — each trigger carries flex-1.
  it('each tab trigger has flex-1 class for full-width distribution', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getAllByTestId('tabs-trigger')).toHaveLength(4))
    screen.getAllByTestId('tabs-trigger').forEach(trigger => {
      expect(trigger).toHaveClass('flex-1')
    })
  })

  it('shows description tab content by default', async () => {
    renderCodeDescArea()
    await waitFor(() => {
      expect(screen.getByTestId('tabs-content-description')).toBeInTheDocument()
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.getByText(/Given an array/)).toBeInTheDocument()
    })
  })

  it('renders nothing when question is undefined', () => {
    renderCodeDescArea({ question: undefined })
    expect(screen.queryByTestId('tabs')).not.toBeInTheDocument()
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
  })

  it('renders nothing when question_instance is undefined', () => {
    renderCodeDescArea({ question_instance: undefined })
    expect(screen.queryByTestId('tabs')).not.toBeInTheDocument()
  })

  it('renders nothing when uqi is undefined', () => {
    renderCodeDescArea({ uqi: undefined })
    expect(screen.queryByTestId('tabs')).not.toBeInTheDocument()
  })

  it('every tab trigger has a title attribute for tooltip/accessibility', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getAllByTestId('tabs-trigger')).toHaveLength(4))
    const titles = screen.getAllByTestId('tabs-trigger').map(t => t.getAttribute('title'))
    expect(titles).toEqual(
      expect.arrayContaining(['Description', 'Submissions', 'Result', 'Leaderboard'])
    )
  })
})

describe('CodeDescArea — tab switching', () => {
  it('switches to submissions tab', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    expect(screen.getByTestId('tabs-content-submissions')).toBeInTheDocument()
  })

  it('switches to leaderboard tab', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Leaderboard'))
    expect(screen.getByTestId('tabs-content-leaderboard')).toBeInTheDocument()
    expect(screen.getByTestId('mock-event-leaderboard')).toBeInTheDocument()
  })

  it('switches to result tab', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Result'))
    expect(screen.getByTestId('tabs-content-result')).toBeInTheDocument()
  })

  it('switches back to description after visiting another tab', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await userEvent.click(withinTabs().getByText('Description'))
    expect(screen.getByText('Two Sum')).toBeInTheDocument()
  })
})

describe('CodeDescArea — result tab', () => {
  it('shows idle state message when submissionState is idle', async () => {
    renderCodeDescArea({ submissionState: 'idle' })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Result'))
    expect(screen.getByText(/No submission yet/i)).toBeInTheDocument()
  })

  it('shows skeleton when submissionState is loading', async () => {
    renderCodeDescArea({ submissionState: 'loading' })
    await waitFor(() =>
      expect(screen.getByTestId('submission-skeleton')).toBeInTheDocument()
    )
  })

  it('auto-switches to result tab when submissionState is loading', async () => {
    renderCodeDescArea({ submissionState: 'loading' })
    await waitFor(() =>
      expect(screen.getByTestId('tabs-content-result')).toBeInTheDocument()
    )
  })

  it('shows SubmissionDetail when submissionState is done', async () => {
    renderCodeDescArea({ submissionState: 'done', latestSubmissionResult: mockSubmissions[0] })
    await waitFor(() =>
      expect(screen.getByTestId('submission-detail')).toBeInTheDocument()
    )
    expect(screen.getByTestId('submission-detail')).toHaveAttribute('data-status', 'Accepted')
  })

  it('does not show SubmissionDetail when done but result is null', async () => {
    renderCodeDescArea({ submissionState: 'done', latestSubmissionResult: null })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Result'))
    expect(screen.queryByTestId('submission-detail')).not.toBeInTheDocument()
  })

  it('auto-switches to result tab when submissionState becomes done on rerender', async () => {
    const baseProps = {
      question: mockQuestion,
      question_instance: mockQuestionInstance,
      uqi: mockUqi,
      eventId: 1 as number | undefined,
      eventName: 'Test Event',
      isCompetitionEvent: true,
      allLanguages: mockLanguages,
      submissions: mockSubmissions,
      ref: mockRef
    }

    const { rerender } = render(
      <TooltipProvider>
        <CodeDescArea {...baseProps} submissionState="idle" latestSubmissionResult={null} />
      </TooltipProvider>
    )
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())

    rerender(
      <TooltipProvider>
        <CodeDescArea {...baseProps} submissionState="done" latestSubmissionResult={mockSubmissions[0]} />
      </TooltipProvider>
    )
    await waitFor(() => expect(screen.getByTestId('tabs-content-result')).toBeInTheDocument())
    expect(screen.getByTestId('submission-detail')).toBeInTheDocument()
  })
})

describe('CodeDescArea — riddle gate', () => {
  it('shows loading spinner when riddle is loading', () => {
    mockedGetRiddleById.mockReturnValue(new Promise(() => {}))
    renderCodeDescArea({
      question_instance: mockQuestionInstanceWithRiddle,
      uqi: mockUqiRiddleIncomplete,
    })
    expect(screen.getByText(/loading challenge lock/i)).toBeInTheDocument()
  })

  it('shows riddle form when riddle is loaded and not yet solved', async () => {
    mockedGetRiddleById.mockResolvedValue(mockRiddle)
    renderCodeDescArea({
      question_instance: mockQuestionInstanceWithRiddle,
      uqi: mockUqiRiddleIncomplete,
    })
    await waitFor(() => expect(screen.getByTestId('riddle-form')).toBeInTheDocument())
    expect(screen.getByText(/Two Sum/)).toBeInTheDocument()
  })

  it('shows normal tabs when riddle_complete is true', async () => {
    mockedGetRiddleById.mockResolvedValue(mockRiddle)
    renderCodeDescArea({ question_instance: mockQuestionInstanceWithRiddle, uqi: mockUqi })
    await waitFor(() => expect(screen.getByTestId('tabs')).toBeInTheDocument())
  })

  it('shows normal tabs when riddle_id is null', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs')).toBeInTheDocument())
  })

  it('shows toast.error and logs when riddle fails to load', async () => {
    mockedGetRiddleById.mockRejectedValue(new Error('Riddle fetch failed'))
    renderCodeDescArea({
      question_instance: mockQuestionInstanceWithRiddle,
      uqi: mockUqiRiddleIncomplete,
    })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load riddle...'))
    expect(logFrontend).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'ERROR', component: 'CodeDescArea' })
    )
  })

  it('shows no riddle form after riddle fails to load', async () => {
    mockedGetRiddleById.mockRejectedValue(new Error('fail'))
    renderCodeDescArea({
      question_instance: mockQuestionInstanceWithRiddle,
      uqi: mockUqiRiddleIncomplete,
    })
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.queryByTestId('riddle-form')).not.toBeInTheDocument()
  })

  it('calls onRiddleSolved prop when solve is clicked', async () => {
    const onRiddleSolved = jest.fn()
    mockedGetRiddleById.mockResolvedValue(mockRiddle)
    renderCodeDescArea({
      question_instance: mockQuestionInstanceWithRiddle,
      uqi: mockUqiRiddleIncomplete,
      onRiddleSolved,
    })
    await waitFor(() => expect(screen.getByTestId('solve-riddle-btn')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('solve-riddle-btn'))
    expect(onRiddleSolved).toHaveBeenCalledTimes(1)
  })

  it('does not throw when onRiddleSolved is undefined and solve is clicked', async () => {
    mockedGetRiddleById.mockResolvedValue(mockRiddle)
    renderCodeDescArea({
      question_instance: mockQuestionInstanceWithRiddle,
      uqi: mockUqiRiddleIncomplete,
    })
    await waitFor(() => expect(screen.getByTestId('solve-riddle-btn')).toBeInTheDocument())
    await expect(userEvent.click(screen.getByTestId('solve-riddle-btn'))).resolves.not.toThrow()
  })
})

describe('CodeDescArea — submissions tab', () => {
  it('shows empty state when submissions prop is empty', async () => {
    renderCodeDescArea({ submissions: [] })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByText(/yet to submit/i)).toBeInTheDocument())
  })

  it('renders submission rows when submissions exist', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => {
      expect(screen.getByTestId('submission-1')).toBeInTheDocument()
      expect(screen.getByTestId('submission-2')).toBeInTheDocument()
    })
  })

  it('shows Accepted status in green', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    expect(screen.getByText('Accepted')).toHaveClass('text-green-500')
  })

  it('shows Wrong Answer status in red', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-2')).toBeInTheDocument())
    expect(screen.getByText('Wrong Answer')).toHaveClass('text-red-500')
  })

  it('shows submission count in footer', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByText(/2 attempts/i)).toBeInTheDocument())
  })

  it('shows singular "attempt" for one submission', async () => {
    renderCodeDescArea({ submissions: [mockSubmissions[0]] })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByText(/1 attempt$/)).toBeInTheDocument())
  })

  it('shows language name from allLanguages prop', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getAllByText('Python').length).toBeGreaterThan(0))
  })

  it('shows N/A for null memory and runtime', async () => {
    renderCodeDescArea({ submissions: [mockSubmissions[1]] })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2)
  })
})

describe('CodeDescArea — submission detail view', () => {
  it('opens submission detail when a row is clicked', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    expect(screen.getByTestId('submission-detail')).toBeInTheDocument()
    expect(screen.getByText('Submission Details')).toBeInTheDocument()
  })

  it('shows back button in submissions detail view', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    expect(screen.getByTestId('back-btn')).toBeInTheDocument()
  })

  it('shows runtime and memory in detail view', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    expect(screen.getByText(/42 ms/)).toBeInTheDocument()
    expect(screen.getByText(/1024 KB/)).toBeInTheDocument()
  })

  it('shows stdout in detail view', async () => {
    renderCodeDescArea({ submissions: [mockSubmissions[0]] })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('shows stderr and compile_output when present', async () => {
    renderCodeDescArea({ submissions: [mockSubmissions[1]] })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    expect(screen.getByText('Traceback...')).toBeInTheDocument()
    expect(screen.getByText('error: syntax')).toBeInTheDocument()
    expect(screen.getByText('Wrong answer on test 1')).toBeInTheDocument()
  })

  it('shows "No additional output" when no output fields', async () => {
    const minimalSub: SubmissionType = {
      ...mockSubmissions[0],
      stdout: null, stderr: null, compile_output: null, message: null,
    }
    renderCodeDescArea({ submissions: [minimalSub] })
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    expect(screen.getByText(/no additional output/i)).toBeInTheDocument()
  })

  it('goes back to submissions list when back button is clicked', async () => {
    renderCodeDescArea()
    await waitFor(() => expect(screen.getByTestId('tabs-list')).toBeInTheDocument())
    await userEvent.click(withinTabs().getByText('Submissions'))
    await waitFor(() => expect(screen.getByTestId('submission-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('submission-1'))
    await userEvent.click(screen.getByTestId('back-btn'))
    expect(screen.queryByTestId('submission-detail')).not.toBeInTheDocument()
    expect(screen.getByTestId('submission-1')).toBeInTheDocument()
  })
})