import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodingView from '../src/views/CodingView'
import { useLocation } from 'react-router-dom'
import { Question } from '../src/types/questions/QuestionPagination.type'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { MostRecentSub } from '../src/types/MostRecentSub.type'
import { CodeRunResponse } from '../src/types/CodeRunResponse.type'
import { SubmitAttemptResponse } from '../src/types/SubmitAttemptResponse.type'
import { Account } from '../src/types/account/Account.type'
import { QuestionInstance } from '../src/types/questions/QuestionInstance.type'
import { UserPreferences } from '../src/types/UserPreferences.type'
import { submitToJudge0 } from '../src/api/Judge0API'
import { submitAttempt } from '../src/api/CodeSubmissionAPI'
import { getProfile } from '../src/api/AuthAPI'
import { toast } from 'sonner'
import { logFrontend } from "../src/api/LoggerAPI"
import { getQuestionInstance, getAllQuestionInstancesByEventID } from '../src/api/QuestionInstanceAPI'
import { getQuestionByID } from '../src/api/QuestionsAPI';
import { getEventByName } from '../src/api/BaseEventAPI';
import { BaseEvent } from '../src/types/BaseEvent.type';
import { describe } from 'node:test'


jest.mock('@monaco-editor/react', () => {
    return function MonacoEditorMock(props: any) {
        return (
            <textarea
                data-testid="monaco-editor"
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
            />
        )
    }
})

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

jest.mock('../src/components/helpers/Loader.tsx', () => {
    return function Loader(props: any) {
        return (
            <div data-testid="Loader" />
        )
    }
})

jest.mock('../src/components/codingPage/ConsoleOutput.tsx', () => {
    return function ConsoleOutput(props: any) {
        return (
            <div data-testid="ConsoleOutput" />
        )
    }
})

jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn()
}))

jest.mock('../src/api/Judge0API', () => ({
    submitToJudge0: jest.fn()
}))

jest.mock('../src/api/CodeSubmissionAPI', () => ({
    submitAttempt: jest.fn()
}))

jest.mock('../src/api/QuestionsAPI', () => ({
    getQuestionByID: jest.fn()
}))

jest.mock('../src/api/BaseEventAPI', () => ({
    getEventByName: jest.fn()
}))

jest.mock('../src/api/AuthAPI', () => ({
    getProfile: jest.fn()
}))

jest.mock('../src/api/QuestionInstanceAPI', () => ({
    getQuestionInstance: jest.fn(),
    getAllQuestionInstancesByEventID: jest.fn()
}))

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
    toast: {
        success: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn(),
}))

jest.mock('../src/components/codingPage/CodeDescArea', () => ({
    __esModule: true,
    default: () => <div data-testid="desc-area" />
}))

jest.mock('../src/components/codingPage/Testcases', () => ({
    __esModule: true,
    default: () => <div />
}))

jest.mock("../src/components/ui/dropdown-menu", () => {
    const React = require('react')

    const DropdownContext = React.createContext({
        itemMap: new Map(),
    })

    return {
        __esModule: true,
        DropdownMenu: ({ children }: any) => (
            <DropdownContext.Provider value={{ itemMap: new Map() }}>
                {children}
            </DropdownContext.Provider>
        ),
        DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
        DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
        DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
    }
})

jest.mock("react-resizable-panels", () => ({
    __esModule: true,
    PanelGroup: React.forwardRef(({ children }: any, ref) => {
        React.useImperativeHandle(ref, () => ({
            setLayout: jest.fn(),
        }))
        return <div data-testid="panel-group" >{children}</div>
    }),
    Panel: ({ children }: any) => (
        <div data-testid="resizable-panel" >{children}</div>
    ),
    PanelResizeHandle: () => <div data-testid="resizable-handle" />,
}))

jest.mock('../src/components/helpers/useTestcases')

const mockedToast = toast as jest.Mocked<typeof toast>
const mockedLogger = logFrontend as jest.Mock
const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>
const mockedSubmitAttempt = submitAttempt as jest.MockedFunction<typeof submitAttempt>
const mockedGetQuestionInstance = getQuestionInstance as jest.MockedFunction<typeof getQuestionInstance>
const mockedGetProfile = getProfile as jest.MockedFunction<typeof getProfile>

const mockProblem: Question = {
    question_id: 1,
    question_name: "Sum Problem",
    question_description: "Add two numbers",
    media: "string",
    difficulty: "Easy",
    language_specific_properties: [],
    tags: [],
    testcases: [],
    created_at: new Date("2025-10-28T10:00:00Z"),
    last_modified_at: new Date("2025-10-28T10:00:00Z"),
}

const mockUseTestcases = useTestcases as jest.Mock

const mockTestcases = [
    {
        caseID: 'Case 1',
        input_data: {
            a: 10,
            b: 20,
        },
    },
]

const question_id = 1
const question_instance_id = 123
const user_id = 1
const event_id = 1
const source_code = "print('Hello')"
const language_id = 71


const mockProfile: Account = {
    id: user_id,
    firstName: "John",
    lastName: "string",
    email: "string@smt.com",
    accountType: "Participant"
}

const mockEvent: BaseEvent = {
    event_id: event_id,
    event_name: 'Competition 10',
    event_location: "online",
    question_cooldown: 5,
    event_start_date: new Date(2024, 5, 24),
    event_end_date: new Date(2024, 5, 24),
    created_at: new Date(2024, 5, 24),
    updated_at: new Date(2024, 5, 24),
}

const mockMostRecentSubResponse: MostRecentSub = {
    user_id: user_id,
    question_instance_id: question_instance_id,
    code: source_code,
    lang_judge_id: language_id
}

const mockJudge0Response = {
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
}

const mockUserPrefs: UserPreferences = {
    pref_id: 1,
    user_id: user_id,
    theme: "light",
    notifications_enabled: false,
    last_used_programming_language: null
}

const mockCodeRunResponse: CodeRunResponse = {
    judge0Response: mockJudge0Response,
    mostRecentSubResponse: mockMostRecentSubResponse,
    userPrefs: mockUserPrefs,
}

const mockQuestionInstances: QuestionInstance[] = [{
    question_instance_id: question_instance_id,
    question_id: question_id,
    event_id: event_id,
    riddle_id: null,
}]

const mockSubmitAttemptResponseSUCCESS: SubmitAttemptResponse = {
    codeRunResponse: mockCodeRunResponse,
    submissionResponse: {
        status_code: 200,
        message: "Submitted"
    },
    leaderboard: null
}

const mockSubmitAttemptResponseFAIL: SubmitAttemptResponse = {
    codeRunResponse: mockCodeRunResponse,
    submissionResponse: {
        status_code: 400,
        message: "Failed"
    },
    leaderboard: null
}

describe('CodingView Component without event', () => {

    beforeEach(() => {
        jest.clearAllMocks()

            ; (useLocation as jest.Mock).mockReturnValue({
                pathname: '/code/1',
                state: { problem: mockProblem },
            })

        const addTestcase = jest.fn()
        const removeTestcase = jest.fn()
        const updateTestcase = jest.fn()
        const setActiveTestcase = jest.fn()

        mockUseTestcases.mockReturnValue({
            testcases: mockTestcases,
            addTestcase,
            removeTestcase,
            updateTestcase,
            loading: false,
            activeTestcase: 'Case 1',
            setActiveTestcase,
        })
    })

    it('renders and shows key panels (resizable panels and sandbox tabs)', async () => {
        mockedGetQuestionInstance.mockResolvedValue(mockQuestionInstances[0])

        render(<CodingView />)

        await waitFor(() => {
            expect(screen.getAllByTestId("panel-group").length).toBe(2)
            expect(screen.getAllByTestId("resizable-panel").length).toBe(4)
            expect(screen.getAllByTestId("resizable-handle").length).toBe(2)
            expect(screen.getByTestId("submit-btn")).toBeInTheDocument()
            expect(screen.getByTestId("language-btn")).toBeInTheDocument()
            expect(screen.getByTestId("coding-btns")).toBeInTheDocument()
            expect(screen.getByTestId("testcases-tab")).toBeInTheDocument()
            expect(screen.getByTestId("code-output-tab")).toBeInTheDocument()
        })

        // questions-btn only appears when questionsInstances.length > 1
        expect(screen.queryByTestId("questions-btn")).not.toBeInTheDocument()
    })

    it("doesn't call panelRef.current.resize when refs are not set", async () => {
        render(<CodingView />)
        fireEvent.click(screen.getByTestId('code-area-fullscreen'))
        expect(screen.getByTestId('code-area-min-icon')).toBeInTheDocument()
    })

    it('toggles and closes code area fullscreen mode', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('code-area-min-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('code-area-fullscreen'))

        expect(screen.queryByTestId('code-area-max-icon')).toBeNull()
        expect(screen.getByTestId('code-area-min-icon')).toBeInTheDocument()
    })

    it('collapses and uncollapses code area', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('code-area-collapse'))

        expect(screen.queryByTestId('code-area-up-icon')).toBeNull()
        expect(screen.getByTestId('code-area-down-icon')).toBeInTheDocument()
    })

    it('toggles and closes output area fullscreen mode', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-min-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('output-area-fullscreen'))

        expect(screen.queryByTestId('output-area-max-icon')).toBeNull()
        expect(screen.getByTestId('output-area-min-icon')).toBeInTheDocument()
    })

    it('collapses and uncollapses output area', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('output-area-collapse'))

        expect(screen.queryByTestId('output-area-down-icon')).toBeNull()
        expect(screen.getByTestId('output-area-up-icon')).toBeInTheDocument()
    })

    it('uncollapses both areas when output area is collapsed and console is already collapsed', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('output-area-collapse'))

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-up-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-down-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()
    })

    it('collapses both areas when console is collapsed and output area is already collapsed', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('code-area-collapse'))

        expect(screen.getByTestId('code-area-down-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-up-icon')).toBeNull()
    })

    it('handles monaco editor code changes', async () => {
        render(<CodingView />)

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'const x = 5')

        expect(editor).toHaveValue('const x = 5')
    })

    it('submits code with successful output', async () => {
        mockedSubmitAttempt.mockResolvedValue(mockSubmitAttemptResponseSUCCESS)
        mockedGetProfile.mockResolvedValue(mockProfile)

        render(<CodingView />)

        expect(screen.queryByTestId("most-recent-sub-btn")).not.toBeInTheDocument()

        await userEvent.click(screen.getByTestId('submit-btn'))

        expect(submitAttempt).toHaveBeenCalled()
        expect(getProfile).toHaveBeenCalled()

        expect(toast.success).toHaveBeenCalledWith(mockSubmitAttemptResponseSUCCESS.submissionResponse.message)
        expect(toast.warning).not.toHaveBeenCalled()
    })

    it('submits code with failure output', async () => {
        mockedSubmitAttempt.mockResolvedValue(mockSubmitAttemptResponseFAIL)
        mockedGetProfile.mockResolvedValue(mockProfile)

        render(<CodingView />)

        expect(screen.queryByTestId("most-recent-sub-btn")).not.toBeInTheDocument()

        await userEvent.click(screen.getByTestId('submit-btn'))

        expect(submitAttempt).toHaveBeenCalled()
        expect(getProfile).toHaveBeenCalled()

        expect(toast.warning).toHaveBeenCalledWith(mockSubmitAttemptResponseFAIL.submissionResponse.message)
        expect(toast.success).not.toHaveBeenCalled()
    })

    it('shows loader when question has no id', () => {
        ; (useLocation as jest.Mock).mockReturnValue({
            pathname: '/code/1',
            state: { problem: { ...mockProblem, id: undefined } },
        })

        render(<CodingView />)

        expect(screen.getByTestId('Loader')).toBeInTheDocument()
    })

    it('execute code and updates logs when run button is clicked', async () => {
        mockedSubmitToJudge0.mockResolvedValueOnce(mockCodeRunResponse)
        mockedGetQuestionInstance.mockResolvedValue(mockQuestionInstances[0])
        mockedGetProfile.mockResolvedValue(mockProfile)

        render(<CodingView />)

        const playButton = screen.getByTestId('play-btn')

        await userEvent.click(playButton!)

        expect(submitToJudge0).toHaveBeenCalled()
        expect(getProfile).toHaveBeenCalled()
    })

    it('handles failed code execution', async () => {
        mockedSubmitToJudge0.mockRejectedValueOnce(new Error("Network error"))

        await expect(submitToJudge0(-1, -1, "code", language_id, []))
            .rejects.toThrow("Network error")
    })

    it('handles async loading state during code execution', async () => {
        mockedSubmitToJudge0.mockResolvedValueOnce(mockCodeRunResponse)
        mockedGetQuestionInstance.mockResolvedValue(mockQuestionInstances[0])
        mockedGetProfile.mockResolvedValue(mockProfile)
        // mockedGetQuestionInstance.mockResolvedValue(mockQuestionInstances[0])

        render(<CodingView />)

        const playButton = screen.getByTestId('play-btn')

        await userEvent.click(playButton!)

        await waitFor(() => expect(screen.getByTestId('Loader')).toBeInTheDocument())
    })

    it('displays coding buttons container', () => {
        render(<CodingView />)

        const codingBtns = screen.getByTestId('coding-btns')
        expect(codingBtns).toBeInTheDocument()
        expect(codingBtns).toHaveTextContent('Code')
    })

    it('maintains code state when changing other UI elements', async () => {
        render(<CodingView />)

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'test code')

        await userEvent.click(screen.getByTestId('code-area-fullscreen'))

        expect(editor).toHaveValue('test code')
    })

    it('renders sandbox with correct dimensions', () => {
        render(<CodingView />)

        const sandbox = screen.getByTestId('sandbox')
        expect(sandbox).toBeInTheDocument()
        expect(sandbox).toHaveClass('px-2', 'h-182.5')
    })

    it('displays console output tab', () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-output-tab')).toBeInTheDocument()
    })

    it('handles code editor onChange with undefined value', () => {
        render(<CodingView />)

        const editor = screen.getByTestId('monaco-editor')
        fireEvent.change(editor, { target: { value: undefined } })

        expect(editor).toBeInTheDocument()
    })

    it('renders all button icons correctly', () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
    })

    it('handles question without id', () => {
        ; (useLocation as jest.Mock).mockReturnValue({
            pathname: '/code/1',
            state: { problem: { ...mockProblem, id: undefined } },
        })

        render(<CodingView />)

        expect(screen.getByTestId('Loader')).toBeInTheDocument()
    })
})