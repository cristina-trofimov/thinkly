import { render, fireEvent, screen, waitFor } from "@testing-library/react"
import '@testing-library/jest-dom'
import HomePage from "../src/views/HomePage"
import * as compApi from '../src/api/CompetitionAPI';
import * as questionsApi from '../src/api/QuestionsAPI';
import { logFrontend } from '../src/api/LoggerAPI'; // Import logFrontend

// Mock the logFrontend utility
jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn(),
}));


jest.mock('../src/config', () => ({
    config: {
        backendUrl: 'https://thinkly-production.up.railway.app'
    }
}));

jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/QuestionsAPI');


jest.mock("../src/components/ui/button", () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// Mock DataTable to avoid needing actual table implementation
jest.mock("../src/components/questionsTable/questionDataTable", () => ({
    DataTable: ({ data }: any) => (
        <div data-testid="data-table">{data.length} questions rendered</div>
    ),
}))

// Mock Calendar
jest.mock("@/components/ui/calendar", () => ({
    Calendar: ({ selected, onSelect }: any) => (
        <div data-testid="calendar">
            <div>Calendar selected: {selected ? selected.toDateString() : "none"}</div>
            <button
                data-testid="select-nov-3"
                onClick={() => onSelect(new Date(2025, 10, 3))}
            >
                Select Nov 3
            </button>
            <button
                data-testid="select-nov-9"
                onClick={() => onSelect(new Date(2025, 10, 9))}
            >
                Select Nov 9
            </button>
            <button
                data-testid="select-nov-10"
                onClick={() => onSelect(new Date(2025, 10, 10))}
            >
                Select Nov 10
            </button>
        </div>
    ),
}))

describe("HomePage", () => {
    // Cast the mock for easier access in tests
    const mockLogFrontend = logFrontend as jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2025, 10, 3, 12, 0, 0));

        // Reset call count for logFrontend before each test
        mockLogFrontend.mockClear();

        // Mock getQuestions to return formatted data (already converted to Date objects)
        (questionsApi.getQuestions as jest.Mock).mockResolvedValue([
            { id: "1", title: "Two sum", date: new Date("2025-08-02"), difficulty: "Easy" },
            { id: "2", title: "Palindrome", date: new Date("2025-08-15"), difficulty: "Medium" },
            { id: "3", title: "Merge K Sorted Lists", date: new Date("2025-07-01"), difficulty: "Hard" },
            { id: "4", title: "Christmas Tree", date: new Date("2025-07-12"), difficulty: "Easy" },
            { id: "5", title: "Inverse String", date: new Date("2025-08-03"), difficulty: "Easy" },
            { id: "6", title: "Hash Map", date: new Date("2025-08-03"), difficulty: "Medium" },
            { id: "7", title: "Binary Tree", date: new Date("2025-08-19"), difficulty: "Hard" },
        ]);

        // Mock getCompetitions to return formatted data (already converted to Date objects)
        (compApi.getCompetitions as jest.Mock).mockResolvedValue([
            {
                id: 1,
                competitionTitle: "WebComp",
                competitionLocation: "Toronto",
                startDate: new Date(2025, 10, 3, 9, 0, 0),
                endDate: new Date(2025, 10, 3, 17, 0, 0),
            },
            {
                id: 2,
                competitionTitle: "CyberComp",
                competitionLocation: "Montreal",
                startDate: new Date(2025, 10, 9, 9, 0, 0),
                endDate: new Date(2025, 10, 9, 17, 0, 0),
            },
        ]);
    })

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks()
    })

    test("renders active competition call to action", async () => {
        render(<HomePage />)
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
            expect(questionsApi.getQuestions).toHaveBeenCalled()
        })
        const button = await screen.findByRole("button", { name: /join competition/i })
        expect(button).toBeInTheDocument()
    })

    test("renders Calendar component", async () => {
        render(<HomePage />)
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
            expect(questionsApi.getQuestions).toHaveBeenCalled()
        })
        const calendar = screen.getByTestId("calendar")
        expect(calendar).toBeInTheDocument()
        expect(calendar).toHaveTextContent(/Calendar selected:/i)
    })

    test("shows WebComp when November 3rd is selected", async () => {
        render(<HomePage />)

        // Wait for competitions to be fetched
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
            expect(questionsApi.getQuestions).toHaveBeenCalled()
        })

        // Select Nov 3 using the test button
        const selectNov3Button = screen.getByTestId("select-nov-3")
        fireEvent.click(selectNov3Button)

        // Now check if WebComp appears
        await waitFor(() => {
            expect(screen.getAllByText(/WebComp/i).length).toBeGreaterThan(0)
        }, { timeout: 3000 })
    })

    test("shows CyberComp when November 9th is selected", async () => {
        render(<HomePage />)

        // Wait for competitions to load
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
            expect(questionsApi.getQuestions).toHaveBeenCalled()
        })

        // Select Nov 9 using the test button
        const selectNov9Button = screen.getByTestId("select-nov-9")
        fireEvent.click(selectNov9Button)

        // Now check if CyberComp appears
        await waitFor(() => {
            expect(screen.getByText(/CyberComp/i)).toBeInTheDocument()
        })
    })

    test("shows no competitions message for dates without competitions", async () => {
        render(<HomePage />)

        // Wait for initial load
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
            expect(questionsApi.getQuestions).toHaveBeenCalled()
        })

        // Select a date without competitions
        const selectNov10Button = screen.getByTestId("select-nov-10")
        fireEvent.click(selectNov10Button)

        // Should show "No competitions on this date" for Nov 10
        await waitFor(() => {
            expect(screen.getByText(/no competitions on this date/i)).toBeInTheDocument()
        })
    })

    test('logs an error when fetching questions fails', async () => {
        // Mock API call to fail
        (questionsApi.getQuestions as jest.Mock).mockRejectedValue(new Error("Network down"));

        render(<HomePage />);

        // Wait for the fetch attempt to complete
        await waitFor(() => {
            expect(questionsApi.getQuestions).toHaveBeenCalled();
            expect(compApi.getCompetitions).toHaveBeenCalled();
        });

        // Check that the error was logged to the backend logger
        expect(mockLogFrontend).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'ERROR',
                message: expect.stringContaining("API Error: Failed to fetch questions. Reason: Network down"),
                component: 'HomePage',
            })
        );
    });

    test('logs an error when fetching competitions fails', async () => {
        // Mock API call to fail
        (compApi.getCompetitions as jest.Mock).mockRejectedValue(new Error("Server timeout"));

        render(<HomePage />);

        // Wait for the fetch attempt to complete
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled();
            expect(questionsApi.getQuestions).toHaveBeenCalled();
        });

        // Check that the error was logged to the backend logger
        expect(mockLogFrontend).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'ERROR',
                message: expect.stringContaining("API Error: Failed to fetch competitions. Reason: Server timeout"),
                component: 'HomePage',
            })
        );
    });

})
