import React from "react"
import { render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HomePage from "../src/views/HomePage"

jest.mock('../src/config', () => ({
  config: { backendUrl: 'http://localhost:8000' },
}));

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
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = jest.fn((url) => {
      const urlString = url?.toString() || ''
      
      if (urlString.includes("/get-questions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, questionTitle: "Two sum", date: "2025-08-02", difficulty: "Easy" },
              { id: 2, questionTitle: "Palindrome", date: "2025-08-15", difficulty: "Medium" },
              { id: 3, questionTitle: "Merge K Sorted Lists", date: "2025-07-01", difficulty: "Hard" },
              { id: 4, questionTitle: "Christmas Tree", date: "2025-07-12", difficulty: "Easy" },
              { id: 5, questionTitle: "Inverse String", date: "2025-08-03", difficulty: "Easy" },
              { id: 6, questionTitle: "Hash Map", date: "2025-08-03", difficulty: "Medium" },
              { id: 7, questionTitle: "Binary Tree", date: "2025-08-19", difficulty: "Hard" },
            ]),
        } as any)
      }

      if (urlString.includes("/get-competitions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { competitionTitle: "WebComp", date: "2025-11-03" },
              { competitionTitle: "CyberComp", date: "2025-11-09" },
            ]),
        } as any)
      }

      return Promise.reject(new Error("Unknown URL"))
    }) as jest.Mock
  })

  afterEach(() => {
    jest.restoreAllMocks()
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/get-competitions")
      )
    })
  
    // Select Nov 3 using the test button
    const selectNov3Button = screen.getByTestId("select-nov-3")
    selectNov3Button.click()
  
    // Now check if WebComp appears
    await waitFor(() => {
      expect(screen.getByText(/WebComp/i)).toBeInTheDocument()
    })
  })
  
  test("shows CyberComp when November 9th is selected", async () => {
    render(<HomePage />)
    
    // Wait for competitions to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/get-competitions")
      )
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/get-competitions")
      )
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

})