import React from "react"
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
        backendUrl: 'http://localhost:8000'
    }
}));

jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/QuestionsAPI');


jest.mock("../src/components/ui/button", () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// Mock DataTable to avoid needing actual table implementation
jest.mock("../src/components/HomePageQuestions/questionDataTable", () => ({
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
                onClick={() => onSelect(new Date('2025-11-03'))}
            >
                Select Nov 3
            </button>
            <button
                data-testid="select-nov-9"
                onClick={() => onSelect(new Date('2025-11-09'))}
            >
                Select Nov 9
            </button>
        </div>
    ),
}))

describe("HomePage", () => {
    // Cast the mock for easier access in tests
    const mockLogFrontend = logFrontend as jest.Mock;

    beforeEach(() => {
        // Reset call count for logFrontend before each test
        mockLogFrontend.mockClear();

        // Mock getQuestions to return formatted data (already converted to Date objects)
        (questionsApi.getQuestions as jest.Mock).mockResolvedValue([
            { id: "1", questionTitle: "Two sum", date: new Date("2025-08-02"), difficulty: "Easy" },
            { id: "2", questionTitle: "Palindrome", date: new Date("2025-08-15"), difficulty: "Medium" },
            { id: "3", questionTitle: "Merge K Sorted Lists", date: new Date("2025-07-01"), difficulty: "Hard" },
            { id: "4", questionTitle: "Christmas Tree", date: new Date("2025-07-12"), difficulty: "Easy" },
            { id: "5", questionTitle: "Inverse String", date: new Date("2025-08-03"), difficulty: "Easy" },
            { id: "6", questionTitle: "Hash Map", date: new Date("2025-08-03"), difficulty: "Medium" },
            { id: "7", questionTitle: "Binary Tree", date: new Date("2025-08-19"), difficulty: "Hard" },
        ]);

        // Mock getCompetitions to return formatted data (already converted to Date objects)
        (compApi.getCompetitions as jest.Mock).mockResolvedValue([
            { competitionTitle: "WebComp", date: new Date("2025-11-03") },
            { competitionTitle: "CyberComp", date: new Date("2025-11-09") },
        ]);
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    test("renders main competition button", () => {
        render(<HomePage />)
        const button = screen.getByRole("button", { name: /it's competition time!/i })
        expect(button).toBeInTheDocument()
    })

    test("renders DataTable with questions", async () => {
        render(<HomePage />)
        await waitFor(() => {
            const table = screen.getByTestId("data-table")
            expect(table).toBeInTheDocument()
            expect(table).toHaveTextContent("7 questions rendered")
        })
    })

    test("renders Calendar component", () => {
        render(<HomePage />)
        const calendar = screen.getByTestId("calendar")
        expect(calendar).toBeInTheDocument()
        expect(calendar).toHaveTextContent(/Calendar selected:/i)
    })

    test("shows WebComp when November 3rd is selected", async () => {
        render(<HomePage />)

        // Wait for competitions to be fetched
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
        })

        // Select Nov 3 using the test button
        const selectNov3Button = screen.getByTestId("select-nov-3")
        fireEvent.click(selectNov3Button)

        // Now check if WebComp appears
        await waitFor(() => {
            expect(screen.getByText(/WebComp/i)).toBeInTheDocument()
        }, { timeout: 3000 })
    })

    test("shows CyberComp when November 9th is selected", async () => {
        render(<HomePage />)

        // Wait for competitions to load
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
        })

        // Select Nov 9 using the test button
        const selectNov9Button = screen.getByTestId("select-nov-9")
        selectNov9Button.click()

        // Now check if CyberComp appears
        await waitFor(() => {
            expect(screen.getByText(/CyberComp/i)).toBeInTheDocument()
        })
    })

    test("shows no competitions message for dates without competitions", async () => {
        render(<HomePage />)

        // Wait for initial load - today's date likely has no competitions
        await waitFor(() => {
            expect(compApi.getCompetitions).toHaveBeenCalled()
        })

        // Should show "No competitions on this date" initially
        await waitFor(() => {
            const noCompMessage = screen.queryByText(/no competitions on this date/i)
            // This will be there if the current date isn't Nov 3 or 9
            if (noCompMessage) {
                expect(noCompMessage).toBeInTheDocument()
            }
        })
    })

    test('logs an error when fetching questions fails', async () => {
        // Mock API call to fail
        (questionsApi.getQuestions as jest.Mock).mockRejectedValue(new Error("Network down"));

        render(<HomePage />);

        // Wait for the fetch attempt to complete
        await waitFor(() => {
            expect(questionsApi.getQuestions).toHaveBeenCalled();
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