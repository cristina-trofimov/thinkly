import React from 'react'
import '@testing-library/jest-dom'
import CodeDescArea from '../src/components/codingPage/CodeDescArea'
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Question } from '../src/types/questions/Question.type'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { getProfile } from '../src/api/AuthAPI'
import { Account } from '../src/types/account/Account.type'
import { MostRecentSub } from '../src/types/MostRecentSub.type'
import { SubmissionType } from '../src/types/SubmissionType.type'
import { getAllSubmissions } from '../src/api/CodeSubmissionAPI'
import { getRiddleById } from '../src/api/RiddlesAPI'

// -------------------- MOCKS --------------------

jest.mock('../src/components/helpers/useTestcases')

jest.mock('../src/api/RiddlesAPI', () => ({
    getRiddleById: jest.fn()
}))

jest.mock('@/hooks/useAnalytics', () => ({
    useAnalytics: () => ({
        trackCodingTabSwitched: jest.fn()
    })
}))

jest.mock('../src/components/forms/RiddleForm', () => ({
    __esModule: true,
    default: ({ riddle, onSolved }: any) => (
        <div data-testid="mock-riddle-form">
            <p>{riddle.question}</p>
            <button onClick={onSolved} data-testid="solve-riddle-button">Solve Riddle</button>
        </div>
    )
}))

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

jest.mock('../src/components/ui/button', () => ({
    __esModule: true,
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props} data-testid='button'>{children}</button>
    )
}))

jest.mock("../src/components/ui/tabs", () => ({
    __esModule: true,
    Tabs: ({ children, value }: any) => <div data-testid="tabs" data-active-tab={value}>{children}</div>,
    TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, value, ...props }: any) => (
        <button data-testid="tabs-trigger" data-value={value} {...props}>{children}</button>
    ),
    TabsContent: ({ value, children, activeValue, ...props }: any) => (
        <div 
            data-testid={`tabs-content-${value}`}
            style={{ display: activeValue === value ? 'block' : 'none' }}
            {...props}
        >
            {children}
        </div>
    ),
}))

jest.mock("../src/components/ui/table", () => ({
    __esModule: true,
    Table: ({ children }: any) => <table data-testid="table">{children}</table>,
    TableHeader: ({ children }: any) => <thead>{children}</thead>,
    TableBody: ({ children }: any) => <tbody>{children}</tbody>,
    TableFooter: ({ children }: any) => <tfoot>{children}</tfoot>,
    TableHead: ({ children }: any) => <th>{children}</th>,
    TableRow: ({ children, onClick, ...props }: any) => (
        <tr onClick={onClick} data-testid="table-row" {...props}>{children}</tr>
    ),
    TableCell: ({ children, className }: any) => <td className={className}>{children}</td>,
}))

jest.mock('../src/components/helpers/UseStateCallback', () => ({
    useStateCallback: (initial: any) => {
        const [state, setState] = React.useState(initial)
        return [state, setState, jest.fn()]
    }
}))

jest.mock('../src/components/leaderboards/CurrentLeaderboard', () => ({
    __esModule: true,
    CurrentLeaderboard: () => <div data-testid="mock-current-leaderboard">Mock Leaderboard</div>
}));

jest.mock('../src/api/AuthAPI', () => ({
    getProfile: jest.fn()
}))

jest.mock('../src/api/CodeSubmissionAPI', () => ({
    getAllSubmissions: jest.fn()
}))

// -------------------- TEST DATA --------------------

const user_id = 1
const question_instance_id = 1
const mockProfile: Account = {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    accountType: "Participant"
}

const mockMostRecentSubResponse: MostRecentSub = {
    user_id: user_id,
    question_instance_id: question_instance_id,
    code: "source_code",
    lang_judge_id: 71
}

const mockSubmissions: SubmissionType[] = [
    {
        user_id: user_id,
        question_instance_id: question_instance_id,
        compile_output: null,
        status: "Accepted",
        runtime: 123,
        memory: 456,
        submitted_on: new Date(2024, 5, 12).toISOString(),
        stdout: "output",
        stderr: null,
        message: null,
    },
    {
        user_id: user_id,
        question_instance_id: question_instance_id,
        compile_output: "error",
        status: "Wrong Answer",
        runtime: 45,
        memory: 128,
        submitted_on: new Date(2024, 5, 11).toISOString(),
        stdout: null,
        stderr: "error",
        message: "test failed",
    }
]

const mockProblem: Question = {
    id: 1,
    title: "Sum Problem",
    description: "Add two numbers",
    media: "",
    preset_code: "",
    template_solution: "",
    difficulty: "Easy",
    date: new Date()
}

const mockRiddle = {
    id: 7,
    question: "What has keys but no locks?",
    answer: "A piano",
    file: null
}

// -------------------- MOCK FUNCTIONS --------------------

const mockedUseTestcases = useTestcases as jest.Mock
const mockedGetRiddleById = getRiddleById as jest.Mock
const mockedGetProfile = getProfile as jest.Mock
const mockedGetAllSubmissions = getAllSubmissions as jest.Mock

// -------------------- SETUP --------------------

beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockedUseTestcases.mockReturnValue({
        testcases: [{
            input_data: { a: 10, b: 20 },
            expected_output: 30
        }],
        loading: false,
    });

    mockedGetProfile.mockResolvedValue(mockProfile);
    mockedGetAllSubmissions.mockResolvedValue(mockSubmissions);
});

const setup = async (options: { 
    shouldRiddleFail?: boolean,
    riddleData?: any,
    showRiddle?: boolean 
} = {}) => {
    const { 
        shouldRiddleFail = false, 
        riddleData = mockRiddle,
        showRiddle = true 
    } = options;

    if (shouldRiddleFail) {
        mockedGetRiddleById.mockRejectedValue(new Error("API Error"));
    } else if (showRiddle) {
        mockedGetRiddleById.mockResolvedValue(riddleData);
    } else {
        mockedGetRiddleById.mockResolvedValue(null);
    }

    render(<CodeDescArea question={mockProblem} mostRecentSub={mockMostRecentSubResponse} />);
    
    // Wait for initial loading states
    await waitFor(() => {
        expect(mockedGetRiddleById).toHaveBeenCalled();
    });
}

// -------------------- TESTS --------------------

describe('CodeDescArea', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-28T10:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('Riddle Logic (Gatekeeper)', () => {
        it("renders loading state initially", async () => {
            mockedGetRiddleById.mockReturnValue(new Promise(() => {}));
            render(<CodeDescArea question={mockProblem} mostRecentSub={mockMostRecentSubResponse} />);
            
            expect(screen.getByText(/loading challenge lock/i)).toBeInTheDocument();
        });

        it("shows RiddleForm and hides description until solved", async () => {
            await setup({ showRiddle: true });

            await waitFor(() => {
                expect(screen.getByTestId("mock-riddle-form")).toBeInTheDocument();
            });

            expect(screen.getByText(mockRiddle.question)).toBeInTheDocument();
            
            // Description should not be visible
            expect(screen.queryByTestId("tabs-content-description")).not.toBeInTheDocument();
        });

        it("reveals problem content after solving the riddle", async () => {
            await setup({ showRiddle: true });

            await waitFor(() => {
                expect(screen.getByTestId("mock-riddle-form")).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId("solve-riddle-button"));

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
                expect(screen.getByText("Sum Problem")).toBeInTheDocument();
                expect(screen.getByText("Add two numbers")).toBeInTheDocument();
            });
        });

        it("bypasses the riddle lock if the API fails", async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await setup({ shouldRiddleFail: true });

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
            });

            expect(screen.queryByTestId("mock-riddle-form")).not.toBeInTheDocument();
            consoleSpy.mockRestore();
        });
    });

    describe('Tab Functionality', () => {
        it("renders all tab triggers after riddle is solved", async () => {
            await setup({ shouldRiddleFail: true });

            await waitFor(() => {
                const triggers = screen.getAllByTestId("tabs-trigger");
                expect(triggers).toHaveLength(3);
            });
        });

        it("shows description content by default", async () => {
            await setup({ shouldRiddleFail: true });

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
                expect(screen.getByText("Sum Problem")).toBeInTheDocument();
                expect(screen.getByText("Add two numbers")).toBeInTheDocument();
                expect(screen.getByText(/a = 10/i)).toBeInTheDocument();
                expect(screen.getByText(/b = 20/i)).toBeInTheDocument();
                expect(screen.getByText(/30/)).toBeInTheDocument();
            });
        });

        it("switches to Submissions tab when clicked", async () => {
            await setup({ shouldRiddleFail: true });

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
            });

            const submissionsTrigger = screen.getByRole('button', { name: /submissions/i });
            fireEvent.click(submissionsTrigger);

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-submissions")).toBeInTheDocument();
                expect(screen.getByTestId("table")).toBeInTheDocument();
                expect(screen.getByText("Accepted")).toBeInTheDocument();
                expect(screen.getByText("Wrong Answer")).toBeInTheDocument();
                expect(screen.getByText("456")).toBeInTheDocument();
                expect(screen.getByText("128")).toBeInTheDocument();
            });

            // Check for attempts count in footer
            await waitFor(() => {
                const footerElement = screen.getByText(/2 attempts/);
                expect(footerElement).toBeInTheDocument();
            });
        });

        it("switches to Leaderboard tab when clicked", async () => {
            await setup({ shouldRiddleFail: true });

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
            });

            const leaderboardTrigger = screen.getByRole('button', { name: /leaderboard/i });
            fireEvent.click(leaderboardTrigger);

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-leaderboard")).toBeInTheDocument();
                expect(screen.getByTestId("mock-current-leaderboard")).toBeInTheDocument();
            });
        });

        it("shows submission details when a submission row is clicked", async () => {
            await setup({ shouldRiddleFail: true });

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
            });

            // Switch to submissions tab
            const submissionsTrigger = screen.getByRole('button', { name: /submissions/i });
            fireEvent.click(submissionsTrigger);

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-submissions")).toBeInTheDocument();
                expect(screen.getByTestId("table")).toBeInTheDocument();
            });

            // Click on the first submission row (using testid)
            const submissionRows = screen.getAllByTestId("table-row");
            expect(submissionRows.length).toBeGreaterThan(0);
            fireEvent.click(submissionRows[0]);

            // Check if submission details are shown
            await waitFor(() => {
                // Look for elements that appear in the details view
                expect(screen.getByText("Accepted")).toBeInTheDocument();
                
                // Check for specific values from the submission
                expect(screen.getByText(/456/i)).toBeInTheDocument();
                expect(screen.getByText(/128/i)).toBeInTheDocument();
            });
        });
    });
});
