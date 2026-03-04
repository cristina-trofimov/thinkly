import React from 'react'
import '@testing-library/jest-dom'
import CodeDescArea from '../src/components/codingPage/CodeDescArea'
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { Question } from '../src/types/questions/Question.type'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { getRiddleById } from '@/api/RiddlesAPI'

// -------------------- MOCKS --------------------

jest.mock('../src/components/helpers/useTestcases')

jest.mock('@/api/RiddlesAPI', () => ({
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
            <button onClick={onSolved}>Solve Riddle</button>
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
    Button: ({ children, ...props }: any) => (
        <button {...props} data-testid='button'>{children}</button>
    )
}))

jest.mock("../src/components/ui/tabs", () => ({
    __esModule: true,
    Tabs: ({ children, value }: any) => <div data-testid="tabs" data-active-tab={value}>{children}</div>,
    TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, value, ...props }: any) => (
        <button data-testid="tabs-trigger" data-value={value} {...props}>{children}</button>
    ),
    TabsContent: ({ value, children }: any) => <div data-testid={`tabs-content-${value}`}>{children}</div>,
}))

jest.mock("../src/components/ui/table", () => ({
    __esModule: true,
    Table: ({ children }: any) => <table data-testid="table">{children}</table>,
    TableHeader: ({ children }: any) => <thead>{children}</thead>,
    TableHead: ({ children }: any) => <th>{children}</th>,
    TableRow: ({ children }: any) => <tr>{children}</tr>,
}))

jest.mock('../src/components/helpers/UseStateCallback', () => ({
    useStateCallback: (initial: any) => {
        const [state, setState] = React.useState(initial)
        return [state, (v: any) => setState(v), jest.fn()]
    }
}))

jest.mock('../src/components/leaderboards/CurrentLeaderboard.tsx', () => ({
    __esModule: true,
    CurrentLeaderboard: () => <div data-testid="mock-current-leaderboard">Mock Leaderboard</div>
}));

// -------------------- TEST DATA --------------------

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

const mockUseTestcases = useTestcases as jest.Mock
const mockGetRiddleById = getRiddleById as jest.Mock

// -------------------- SETUP --------------------

beforeEach(() => {
    jest.clearAllMocks();
    
    // Global fallback to prevent destructuring errors
    mockUseTestcases.mockReturnValue({
        testcases: [],
        loading: false,
    });
});

const setup = async (riddleData: any = mockRiddle, shouldFail = false) => {
    mockUseTestcases.mockReturnValue({
        testcases: [{
            input_data: { num: 10, b: 20 },
            expected_output: 30
        }],
        loading: false,
    })

    if (shouldFail) {
        mockGetRiddleById.mockRejectedValue(new Error("API Error"))
    } else {
        mockGetRiddleById.mockResolvedValue(riddleData)
    }

    const utils = render(<CodeDescArea question={mockProblem} />)
    return { ...utils }
}

// -------------------- TESTS --------------------

describe('CodeDescArea', () => {
    describe('Riddle Logic (Gatekeeper)', () => {
        it("renders loading state initially", async () => {
            mockGetRiddleById.mockReturnValue(new Promise(() => {}));
            render(<CodeDescArea question={mockProblem} />);
            expect(screen.getByText(/loading challenge lock/i)).toBeInTheDocument();
        });

        it("shows RiddleForm and hides description until solved", async () => {
            await setup();

            await waitFor(() => {
                expect(screen.getByTestId("mock-riddle-form")).toBeInTheDocument();
            });

            expect(screen.getByText(mockRiddle.question)).toBeInTheDocument();
            
            // Specifically verify that the Tab Content (Description) is NOT rendered
            expect(screen.queryByTestId("tabs-content-description")).not.toBeInTheDocument();
        });

        it("reveals problem content after solving the riddle", async () => {
            await setup();
            await waitFor(() => screen.getByTestId("mock-riddle-form"));

            fireEvent.click(screen.getByText("Solve Riddle"));

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
                expect(screen.getByText("Add two numbers")).toBeInTheDocument();
            });
        });

        it("bypasses the riddle lock if the API fails", async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await setup(null, true);

            await waitFor(() => {
                expect(screen.getByTestId("tabs-content-description")).toBeInTheDocument();
            });
            
            expect(screen.queryByTestId("mock-riddle-form")).not.toBeInTheDocument();
            consoleSpy.mockRestore();
        });
    });

    describe('Tab Functionality', () => {
        it("renders all tab triggers after riddle is solved", async () => {
            await setup(null, true);

            await waitFor(() => {
                expect(screen.getAllByTestId("tabs-trigger").length).toBe(3);
            });
        });

        it("switches to the Leaderboard tab when clicked", async () => {
            await setup(null, true);
            await waitFor(() => screen.getByTestId("tabs-content-description"));

            const leaderboardTrigger = screen.getByRole('button', { name: /leaderboard/i });
            fireEvent.click(leaderboardTrigger);

            expect(screen.getByTestId("mock-current-leaderboard")).toBeInTheDocument();
        });
    });
});