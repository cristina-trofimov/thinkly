import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodingView from '../src/views/CodingView'
import { useLocation } from 'react-router-dom'
import { Question, TagResponse, TestCase } from '../src/types/questions/QuestionPagination.type'
import { MostRecentSub } from '../src/types/submissions/MostRecentSub.type'
import { CodeRunResponse } from '../src/types/submissions/CodeRunResponse.type'
import { SubmitAttemptResponse } from '../src/types/submissions/SubmitAttemptResponse.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'
import { UserPreferences } from '../src/types/account/UserPreferences.type'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'
import { submitToJudge0 } from '../src/api/Judge0API'
import { submitAttempt } from '../src/api/SubmitCodeAPI'
import { putUserInstance } from '../src/api/UserQuestionInstanceAPI'
import { toast } from 'sonner'
import { useCodingHooks } from '../src/components/helpers/CodingHooks'
import type { Language } from '../src/types/questions/Language.type'
import { UserContext } from '../src/context/UserContext'
import type { Account } from '../src/types/account/Account.type'
import type { UserQuestionInstance } from '../src/types/submissions/UserQuestionInstance.type'


// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/components/helpers/CodingHooks', () => ({
    useCodingHooks: jest.fn(),
}))

jest.mock('@monaco-editor/react', () => {
    return function MonacoEditorMock(props: any) {
        return (
            <textarea
                data-testid="monaco-editor"
                value={props.value ?? ''}
                onChange={(e) => props.onChange?.(e.target.value)}
            />
        )
    }
})

jest.mock('../src/lib/axiosClient', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    API_URL: 'http://localhost:8000',
}))

jest.mock('../src/components/helpers/Loader.tsx', () => {
    return function Loader({ isOpen }: any) {
        return <div data-testid="Loader" data-open={String(isOpen)} />
    }
})

jest.mock('../src/components/codingPage/ConsoleOutput.tsx', () => {
    return function ConsoleOutput() {
        return <div data-testid="ConsoleOutput" />
    }
})

jest.mock('../src/components/helpers/ConfirmCodeReset', () => ({
    __esModule: true,
    default: ({ isOpen, setClose, setReset }: any) =>
        isOpen ? (
            <div data-testid="confirm-reset-dialog">
                <button data-testid="reset-btn" onClick={setReset}>Reset</button>
                <button data-testid="cancel-reset-btn" onClick={setClose}>Cancel</button>
            </div>
        ) : null,
}))

jest.mock('../src/api/LoggerAPI', () => ({ logFrontend: jest.fn() }))
jest.mock('../src/api/Judge0API', () => ({ submitToJudge0: jest.fn() }))
jest.mock('../src/api/SubmitCodeAPI', () => ({ submitAttempt: jest.fn() }))
jest.mock('../src/api/QuestionsAPI', () => ({ getQuestionByID: jest.fn() }))
jest.mock('../src/api/BaseEventAPI', () => ({ getEventByID: jest.fn() }))
jest.mock('../src/api/AuthAPI', () => ({ getProfile: jest.fn() }))
jest.mock('../src/api/QuestionInstanceAPI', () => ({
    getQuestionInstance: jest.fn(),
    getAllQuestionInstancesByEventID: jest.fn(),
}))
jest.mock('../src/api/UserQuestionInstanceAPI', () => ({
    getUserInstance: jest.fn(),
    putUserInstance: jest.fn(),
}))
jest.mock('../src/api/LanguageAPI', () => ({ getAllLanguages: jest.fn() }))
jest.mock('../src/api/UserPreferencesAPI', () => ({ getUserPrefs: jest.fn() }))

jest.mock('../src/hooks/useAnalytics', () => ({
    useAnalytics: () => ({
        trackCodingPageOpened: jest.fn(),
        trackLanguageChanged: jest.fn(),
        trackCodeReset: jest.fn(),
        trackCodeRun: jest.fn(),
        trackCodeSubmitted: jest.fn(),
    }),
}))

jest.mock('sonner', () => ({
    toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn(),
}))

// CodeDescArea is mocked but captures onRiddleSolved so tests can invoke it
let capturedOnRiddleSolved: (() => void) | undefined
jest.mock('../src/components/codingPage/CodeDescArea', () => ({
    __esModule: true,
    default: ({ onRiddleSolved }: any) => {
        capturedOnRiddleSolved = onRiddleSolved
        return <div data-testid="desc-area" />
    },
}))

jest.mock('../src/components/codingPage/Testcases', () => ({
    __esModule: true,
    default: () => <div data-testid="testcases-content" />,
}))

jest.mock('../src/components/helpers/useTestcases', () => ({
    useTestcases: jest.fn(),
}))

jest.mock('../src/components/ui/dropdown-menu', () => ({
    __esModule: true,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@radix-ui/react-dropdown-menu', () => ({
    __esModule: true,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onSelect, ...props }: any) => (
        <div onClick={onSelect} {...props}>{children}</div>
    ),
}))

jest.mock('react-resizable-panels', () => ({
    __esModule: true,
    PanelGroup: React.forwardRef(({ children }: any, ref: any) => {
        React.useImperativeHandle(ref, () => ({ setLayout: jest.fn() }))
        return <div data-testid="panel-group">{children}</div>
    }),
    Panel: ({ children }: any) => <div data-testid="resizable-panel">{children}</div>,
    PanelResizeHandle: () => <div data-testid="resizable-handle" />,
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const language_id = 71
const user_id = 1
const user_question_instance_id = 123
const source_code = "print('Hello')"

const mockLanguages: Language[] = [
    { row_id: 1, lang_judge_id: 62, monaco_id: 'Java', display_name: 'Java', active: true },
    { row_id: 2, lang_judge_id: 71, monaco_id: 'Python', display_name: 'Python', active: true },
]

const mockProblem: Question = {
    question_id: 1,
    question_name: 'Sum Problem',
    question_description: 'Add two numbers',
    media: null,
    difficulty: 'Easy',
    language_specific_properties: [],
    tags: [] as TagResponse[],
    test_cases: [] as TestCase[],
    created_at: new Date('2025-10-28T10:00:00Z'),
    last_modified_at: new Date('2025-10-28T10:00:00Z'),
}

const mockProblemWithPreset: Question = {
    ...mockProblem,
    language_specific_properties: [
        {
            language_id: 1, question_id: 1, language_display_name: 'Java',
            preset_functions: '// Java preset', template_code: '// Java solution',
            imports: '', preset_classes: '', main_function: '',
        },
        {
            language_id: 2, question_id: 1, language_display_name: 'Python',
            preset_functions: '# Python preset', template_code: '# Python solution',
            imports: '', preset_classes: '', main_function: '',
        },
    ],
}

const mockQuestionInstance: QuestionInstance = {
    question_instance_id: 1,
    question_id: 1,
    event_id: 1,
    riddle_id: null,
}

const mockQuestionInstanceWithRiddle: QuestionInstance = {
    ...mockQuestionInstance,
    riddle_id: 99,
}

const mockUserPrefs: UserPreferences = {
    pref_id: 1, user_id, theme: 'light',
    notifications_enabled: false, last_used_programming_language: null,
}

const mockJudge0Response = {
    stdout: 'Hello\n', stderr: null, compile_output: null, message: null,
    status: { id: 3, description: 'Accepted' }, memory: '1024', time: '0.123', token: null,
}

const mockCodeRunResponse: CodeRunResponse = {
    judge0Response: mockJudge0Response,
    userPrefs: mockUserPrefs,
}

const mockMostRecentSub: MostRecentSub = {
    row_id: 1, user_question_instance_id,
    code: source_code, submitted_on: new Date(), lang_judge_id: language_id,
}

const mockSubmission: SubmissionType = {
    submission_id: 1, user_question_instance_id, lang_judge_id: language_id,
    compile_output: null, status: 'Accepted', runtime: null, memory: null,
    submitted_on: new Date(), stdout: null, stderr: null, message: null,
}

const mockSubmissionFail: SubmissionType = {
    ...mockSubmission, status: 'Wrong Answer',
}

const mockSubmitSuccess: SubmitAttemptResponse = {
    codeRunResponse: mockCodeRunResponse,
    submissionResponse: mockSubmission,
    mostRecentSubResponse: mockMostRecentSub,
}

const mockSubmitFail: SubmitAttemptResponse = {
    codeRunResponse: mockCodeRunResponse,
    submissionResponse: mockSubmissionFail,
    mostRecentSubResponse: mockMostRecentSub,
}

const mockUqi: UserQuestionInstance = {
    user_question_instance_id: 55,
    user_id: 1,
    question_instance_id: 1,
    riddle_complete: false,
    attempts: 0,
    lapse_time: null,
    points: null,
}

const mockUqiRiddleComplete: UserQuestionInstance = {
    ...mockUqi,
    riddle_complete: true,
}

// ─── Hook mock factory ────────────────────────────────────────────────────────

const makeMockHook = (overrides: Record<string, any> = {}) => ({
    startTime: null,
    mostRecentSub: null,
    setMostRecentSub: jest.fn(),
    userQuestionInstance: null,
    setUserQuestionInstance: jest.fn(),
    isLoading: false,
    setIsLoading: jest.fn(),
    activeQuestion: mockProblem,
    setActiveQuestion: jest.fn(),
    activeQuestionInstance: mockQuestionInstance,
    setActiveQuestionInstance: jest.fn(),
    activeDisplayQuestionName: 'Question 1',
    setActiveDisplayQuestionName: jest.fn(),
    questions: [mockProblem],
    questionsInstances: [mockQuestionInstance],
    languages: mockLanguages,
    prevLangRef: { current: mockLanguages[0] },
    userPreferences: mockUserPrefs,
    selectedLang: mockLanguages[0], // Java
    setSelectedLang: jest.fn(),
    event: null,
    testcases: [],
    loadingMsg: '',
    setLoadingMsg: jest.fn(),
    ...overrides,
})

const mockedUseCodingHooks = useCodingHooks as jest.Mock
const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>
const mockedSubmitAttempt = submitAttempt as jest.MockedFunction<typeof submitAttempt>
const mockedPutUserInstance = putUserInstance as jest.MockedFunction<typeof putUserInstance>

// ─── Setup ────────────────────────────────────────────────────────────────────

const { getProfile } = require('../src/api/AuthAPI')

beforeEach(() => {
    jest.clearAllMocks()
    capturedOnRiddleSolved = undefined
        ; (useLocation as jest.Mock).mockReturnValue({
            pathname: '/code/1',
            state: { problem: mockProblem },
        })
    mockedUseCodingHooks.mockReturnValue(makeMockHook())
        ; (getProfile as jest.Mock).mockResolvedValue({ id: 1 })
    mockedPutUserInstance.mockResolvedValue(mockUqiRiddleComplete)
})

const mockUser: Account = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    accountType: 'Participant' as const,
}

const renderCodingView = () =>
    render(
        <UserContext.Provider value={{ user: mockUser, loading: false, setUser: jest.fn(), refreshUser: jest.fn() }}>
            <CodingView />
        </UserContext.Provider>
    )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CodingView — rendering', () => {
    it('renders all key structural elements', () => {
        renderCodingView()
        expect(screen.getAllByTestId('panel-group')).toHaveLength(2)
        expect(screen.getAllByTestId('resizable-panel')).toHaveLength(4)
        expect(screen.getAllByTestId('resizable-handle')).toHaveLength(2)
        expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
        expect(screen.getByTestId('coding-btns')).toBeInTheDocument()
        expect(screen.getByTestId('code-output-tab')).toBeInTheDocument()
        expect(screen.getByTestId('sandbox')).toHaveClass('px-2', 'h-162.5')
    })

    it('renders the monaco editor', () => {
        renderCodingView()
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    it('renders the language dropdown with selected language', () => {
        renderCodingView()
        expect(screen.getByTestId('language-btn')).toHaveTextContent('Java')
    })

    it('shows loader when isLoading is true', () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ isLoading: true }))
        renderCodingView()
        expect(screen.getByTestId('Loader')).toHaveAttribute('data-open', 'true')
    })

    it('loader is not open when both loading flags are false', () => {
        renderCodingView()
        expect(screen.getByTestId('Loader')).toHaveAttribute('data-open', 'false')
    })

    it('shows fallback message when activeQuestion is null', () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ activeQuestion: null }))
        renderCodingView()
        expect(screen.getByText(/nothing loaded/i)).toBeInTheDocument()
        expect(screen.queryByTestId('sandbox')).not.toBeInTheDocument()
    })

    it('does not show questions dropdown when only one question instance', () => {
        renderCodingView()
        expect(screen.queryByTestId('questions-btn')).not.toBeInTheDocument()
    })

    it('shows questions dropdown when multiple question instances exist', () => {
        const q2: Question = { ...mockProblem, question_id: 2, question_name: 'Problem 2' }
        const qi2: QuestionInstance = { ...mockQuestionInstance, question_instance_id: 2, question_id: 2 }
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            questions: [mockProblem, q2],
            questionsInstances: [mockQuestionInstance, qi2],
        }))
        renderCodingView()
        expect(screen.getByTestId('questions-menu')).toBeInTheDocument()
        expect(screen.getByTestId('questionItem-Sum Problem')).toBeInTheDocument()
        expect(screen.getByTestId('questionItem-Problem 2')).toBeInTheDocument()
    })

    it('shows most-recent-sub button when mostRecentSub is set', () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ mostRecentSub: mockMostRecentSub }))
        renderCodingView()
        expect(screen.getByTestId('most-recent-sub-btn')).toBeInTheDocument()
    })

    it('does not show most-recent-sub button when mostRecentSub is null', () => {
        renderCodingView()
        expect(screen.queryByTestId('most-recent-sub-btn')).not.toBeInTheDocument()
    })

    it('renders coding area header with "Code" label', () => {
        renderCodingView()
        expect(screen.getByTestId('coding-btns')).toHaveTextContent('Code')
    })
})

describe('CodingView — panel toggles', () => {
    it('toggles code area to fullscreen and back', async () => {
        renderCodingView()
        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
        await userEvent.click(screen.getByTestId('code-area-fullscreen'))
        expect(screen.getByTestId('code-area-min-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('code-area-max-icon')).not.toBeInTheDocument()
        await userEvent.click(screen.getByTestId('code-area-fullscreen'))
        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
    })

    it('collapses and uncollapses code area', async () => {
        renderCodingView()
        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        await userEvent.click(screen.getByTestId('code-area-collapse'))
        expect(screen.getByTestId('code-area-down-icon')).toBeInTheDocument()
        await userEvent.click(screen.getByTestId('code-area-collapse'))
        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
    })

    it('toggles output area to fullscreen and back', async () => {
        renderCodingView()
        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
        await userEvent.click(screen.getByTestId('output-area-fullscreen'))
        expect(screen.getByTestId('output-area-min-icon')).toBeInTheDocument()
        await userEvent.click(screen.getByTestId('output-area-fullscreen'))
        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
    })

    it('collapses and uncollapses output area', async () => {
        renderCodingView()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        await userEvent.click(screen.getByTestId('output-area-collapse'))
        expect(screen.getByTestId('output-area-up-icon')).toBeInTheDocument()
    })

    it('renders all initial panel button icons', () => {
        renderCodingView()
        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
    })
})

describe('CodingView — editor', () => {
    it('updates code state when editor changes', async () => {
        renderCodingView()
        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'const x = 5')
        expect(editor).toHaveValue('const x = 5')
    })

    it('preserves code state when toggling fullscreen', async () => {
        renderCodingView()
        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'my code')
        await userEvent.click(screen.getByTestId('code-area-fullscreen'))
        expect(editor).toHaveValue('my code')
    })

    it('handles undefined value from monaco onChange gracefully', () => {
        renderCodingView()
        const editor = screen.getByTestId('monaco-editor')
        fireEvent.change(editor, { target: { value: undefined } })
        expect(editor).toBeInTheDocument()
    })

    it('clicking most-recent-sub button restores previous code', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ mostRecentSub: mockMostRecentSub }))
        renderCodingView()
        await userEvent.click(screen.getByTestId('most-recent-sub-btn'))
        expect(screen.getByTestId('monaco-editor')).toHaveValue(source_code)
    })

    it('initializes editor with preset_functions when question has language_specific_properties', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ activeQuestion: mockProblemWithPreset }))
        renderCodingView()
        await waitFor(() =>
            expect(screen.getByTestId('monaco-editor')).toHaveValue('// Java solution')
        )
    })

    it('falls back to generic comment when no preset or template matches', async () => {
        renderCodingView()
        // mockProblem has no language_specific_properties, Java monaco_id is 'Java' (not python)
        await waitFor(() =>
            expect(screen.getByTestId('monaco-editor')).toHaveValue('// Write your solution here.')
        )
    })

    it('saves current code to buffer when language is switched', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ activeQuestion: mockProblemWithPreset }))
        renderCodingView()

        await waitFor(() =>
            expect(screen.getByTestId('monaco-editor')).toHaveValue('// Java solution')
        )

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'my custom java code')

        // Switching language should save current code and show info toast
        fireEvent.click(screen.getByTestId('languageItem-Python'))

        expect(toast.info).toHaveBeenCalledWith(
            expect.stringContaining('Code saved in this session')
        )
    })

    it('shows confirmation dialog when reset is clicked with modified code', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ activeQuestion: mockProblemWithPreset }))
        renderCodingView()

        await waitFor(() =>
            expect(screen.getByTestId('monaco-editor')).toHaveValue('// Java solution')
        )

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'modified code')

        const codingBtns = screen.getByTestId('coding-btns')
        const buttons = within(codingBtns).getAllByRole('button')
        await userEvent.click(buttons[1]) // reset button

        expect(screen.getByTestId('confirm-reset-dialog')).toBeInTheDocument()
    })

    it('resets code to preset after confirming reset dialog', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ activeQuestion: mockProblemWithPreset }))
        renderCodingView()

        await waitFor(() =>
            expect(screen.getByTestId('monaco-editor')).toHaveValue('// Java solution')
        )

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'modified code')

        const codingBtns = screen.getByTestId('coding-btns')
        const buttons = within(codingBtns).getAllByRole('button')
        await userEvent.click(buttons[1])

        await waitFor(() => expect(screen.getByTestId('reset-btn')).toBeInTheDocument())
        await userEvent.click(screen.getByTestId('reset-btn'))

        await waitFor(() =>
            expect(screen.getByTestId('monaco-editor')).toHaveValue('// Java solution')
        )
    })
})

describe('CodingView — run code', () => {
    it('calls submitToJudge0 when play button is clicked', async () => {
        mockedSubmitToJudge0.mockResolvedValueOnce(mockCodeRunResponse)
        renderCodingView()
        await userEvent.click(screen.getByTestId('play-btn'))
        await waitFor(() => expect(submitToJudge0).toHaveBeenCalledTimes(1))
        // userId should be passed as last arg
        expect(mockedSubmitToJudge0).toHaveBeenCalledWith(
            expect.anything(), expect.anything(), expect.anything(), expect.anything(), user_id
        )
    })

    it('does not call submitToJudge0 when riddle is not complete', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            activeQuestionInstance: mockQuestionInstanceWithRiddle,
            userQuestionInstance: { riddle_complete: false },
        }))
        renderCodingView()
        await userEvent.click(screen.getByTestId('play-btn'))
        expect(submitToJudge0).not.toHaveBeenCalled()
        expect(toast.warning).toHaveBeenCalledWith('Please answer the riddle first...')
    })

    it('allows run when riddle_id is null', async () => {
        mockedSubmitToJudge0.mockResolvedValueOnce(mockCodeRunResponse)
        renderCodingView()
        await userEvent.click(screen.getByTestId('play-btn'))
        await waitFor(() => expect(submitToJudge0).toHaveBeenCalled())
    })
})


describe('CodingView - submit code', () => {
    it('calls submitAttempt with correct args including userId', async () => {
        mockedSubmitAttempt.mockResolvedValueOnce(mockSubmitSuccess)
        renderCodingView()
        // Wait for getProfile to resolve so currentUserId is populated before clicking
        await userEvent.click(screen.getByTestId('submit-btn'))
        await waitFor(() => expect(submitAttempt).toHaveBeenCalledTimes(1))
        // expect.anything() does NOT match null, and the default hook mock has
        // userQuestionInstance=null and event=null. Check userId and isAlgoTime args.
        const callArgs = mockedSubmitAttempt.mock.calls[0]
        expect(callArgs[callArgs.length - 2]).toBe(user_id)   // userId
        expect(callArgs[callArgs.length - 1]).toBe(false)      // isAlgoTime (no algo session)
    })

    it('shows submission result inline (not toast) when Accepted', async () => {
        mockedSubmitAttempt.mockResolvedValueOnce(mockSubmitSuccess)
        renderCodingView()
        await userEvent.click(screen.getByTestId('submit-btn'))
        await waitFor(() => expect(submitAttempt).toHaveBeenCalledTimes(1))
        // Result is shown inline via state - no success/warning toast is fired
        expect(toast.success).not.toHaveBeenCalled()
        expect(toast.warning).not.toHaveBeenCalled()
    })

    it('shows result inline (not toast) when status is not Accepted', async () => {
        mockedSubmitAttempt.mockResolvedValueOnce(mockSubmitFail)
        renderCodingView()
        await userEvent.click(screen.getByTestId('submit-btn'))
        await waitFor(() => expect(submitAttempt).toHaveBeenCalledTimes(1))
        // Non-accepted results are shown inline, not via toast
        expect(toast.success).not.toHaveBeenCalled()
        expect(toast.warning).not.toHaveBeenCalled()
        expect(toast.error).not.toHaveBeenCalled()
    })


    it('does not call submitAttempt when riddle is not complete', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            activeQuestionInstance: mockQuestionInstanceWithRiddle,
            userQuestionInstance: { riddle_complete: false },
        }))
        renderCodingView()
        await userEvent.click(screen.getByTestId('submit-btn'))
        expect(submitAttempt).not.toHaveBeenCalled()
        expect(toast.warning).toHaveBeenCalledWith('Please answer the riddle first...')
    })

    it('dispatches info toast when language is switched', async () => {
        renderCodingView()
        fireEvent.click(screen.getByTestId('languageItem-Python'))
        expect(toast.info).toHaveBeenCalledWith(
            expect.stringContaining('Code saved in this session')
        )
    })
})

describe('CodingView — handleRiddleSolved', () => {
    it('calls putUserInstance with riddle_complete:true when onRiddleSolved is invoked', async () => {
        const setUserQuestionInstance = jest.fn()
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            userQuestionInstance: mockUqi,
            setUserQuestionInstance,
            activeQuestionInstance: mockQuestionInstanceWithRiddle,
        }))
        mockedPutUserInstance.mockResolvedValue(mockUqiRiddleComplete)

        renderCodingView()

        // Invoke the handler that was passed as onRiddleSolved to CodeDescArea
        await waitFor(() => expect(capturedOnRiddleSolved).toBeDefined())
        await capturedOnRiddleSolved!()

        expect(mockedPutUserInstance).toHaveBeenCalledWith(
            expect.objectContaining({ riddle_complete: true })
        )
    })

    it('calls setUserQuestionInstance with the API response after riddle solved', async () => {
        const setUserQuestionInstance = jest.fn()
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            userQuestionInstance: mockUqi,
            setUserQuestionInstance,
            activeQuestionInstance: mockQuestionInstanceWithRiddle,
        }))
        mockedPutUserInstance.mockResolvedValue(mockUqiRiddleComplete)

        renderCodingView()

        await waitFor(() => expect(capturedOnRiddleSolved).toBeDefined())
        await capturedOnRiddleSolved!()

        await waitFor(() =>
            expect(setUserQuestionInstance).toHaveBeenCalledWith(mockUqiRiddleComplete)
        )
    })

    it('does nothing when userQuestionInstance is null', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            userQuestionInstance: null,
        }))

        renderCodingView()

        await waitFor(() => expect(capturedOnRiddleSolved).toBeDefined())
        await capturedOnRiddleSolved!()

        expect(mockedPutUserInstance).not.toHaveBeenCalled()
    })

    it('logs error when putUserInstance throws during riddle solve', async () => {
        const { logFrontend } = require('../src/api/LoggerAPI')
        mockedUseCodingHooks.mockReturnValue(makeMockHook({
            userQuestionInstance: mockUqi,
            activeQuestionInstance: mockQuestionInstanceWithRiddle,
        }))
        mockedPutUserInstance.mockRejectedValue(new Error('network error'))

        renderCodingView()

        await waitFor(() => expect(capturedOnRiddleSolved).toBeDefined())
        await capturedOnRiddleSolved!()

        await waitFor(() =>
            expect(logFrontend).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'ERROR', component: 'CodingView' })
            )
        )
    })
})

describe('mostRecentSub', () => {
    it('defaults to 2-column grid when no mostRecentSub', async () => {
        renderCodingView()

        expect(screen.getByTestId("output-btns")).toHaveClass('grid grid-cols-2 gap-2')
        expect(screen.queryByTestId("most-recent-sub-btn")).not.toBeInTheDocument()
    })

    it('switches to 3-column grid when mostRecentSub is set', async () => {
        mockedUseCodingHooks.mockReturnValue(makeMockHook({ mostRecentSub: mockMostRecentSub }))

        renderCodingView()

        await waitFor(() =>
            expect(screen.getByTestId("output-btns")).toHaveClass('grid grid-cols-3 gap-2')
        )
        expect(screen.getByTestId("most-recent-sub-btn")).toBeInTheDocument()
    })
})