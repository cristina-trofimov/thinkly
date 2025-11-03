import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HomePage from "../src/views/HomePage"

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
      Calendar selected: {selected ? selected.toDateString() : "none"}
    </div>
  ),
}))

describe("HomePage", () => {
  test("renders main competition button", () => {
    render(<HomePage />)
    const button = screen.getByRole("button", { name: /it's competition time!/i })
    expect(button).toBeInTheDocument()
  })

  test("renders DataTable with questions", () => {
    render(<HomePage />)
    const table = screen.getByTestId("data-table")
    expect(table).toBeInTheDocument()
    expect(table).toHaveTextContent("7 questions rendered")
  })

  test("renders Calendar component", () => {
    render(<HomePage />)
    const calendar = screen.getByTestId("calendar")
    expect(calendar).toBeInTheDocument()
    expect(calendar).toHaveTextContent(/Calendar selected:/i)
  })

  test("renders upcoming competitions", () => {
    render(<HomePage />)
    const webComp = screen.getByText(/WebComp/i)
    const cyberComp = screen.getByText(/CyberComp/i)
    expect(webComp).toBeInTheDocument()
    expect(cyberComp).toBeInTheDocument()
  })

  test("competition buttons show correct status", () => {
    render(<HomePage />)
    const registeredButton = screen.getByText(/Registered/i)
    const joinButton = screen.getByTestId("competition-button-join")
    expect(registeredButton).toBeInTheDocument()
    expect(joinButton).toBeInTheDocument()
  })
})