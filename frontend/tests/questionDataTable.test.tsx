import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { DataTable } from "../src/components/HomePageQuestions/questionDataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { waitFor } from "@testing-library/react"

// Mock Button, Input, DropdownMenu components (if needed)
jest.mock("../src/components/ui/button", () => ({
  Button: ({ children, ...props }: unknown) => <button {...props}>{children}</button>,
}))

jest.mock("../src/components/ui/input", () => ({
  Input: ({ ...props }: unknown) => <input {...props} />,
}))

jest.mock("../src/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: unknown) => (
    <div {...props} onClick={onClick}>
      {children}
    </div>),
  DropdownMenuLabel: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div>---</div>,
}))

// Sample columns and data
interface Question {
  id: string
  questionTitle: string
  difficulty: string
}

const columns: ColumnDef<Question>[] = [
  { accessorKey: "questionTitle", header: "Question Title" },
  { accessorKey: "difficulty", header: "Difficulty" },
]

const data: Question[] = [
  { id: "1", questionTitle: "Two Sum", difficulty: "Easy" },
  { id: "2", questionTitle: "Palindrome", difficulty: "Medium" },
]

describe("DataTable", () => {
  test("renders column headers", () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText("Question Title")).toBeInTheDocument()
    expect(screen.getByText("Difficulty")).toBeInTheDocument()
  })

  test("renders all rows", () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText("Two Sum")).toBeInTheDocument()
    expect(screen.getByText("Palindrome")).toBeInTheDocument()
    const easyElements = screen.getAllByText("Easy")
    expect(easyElements.length).toBeGreaterThan(0)
    const mediumElements = screen.getAllByText("Medium")
    expect(mediumElements.length).toBeGreaterThan(0)
  })

  test("shows 'No results.' when data is empty", () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  test("search input filters rows", async () => {
    render(<DataTable columns={columns} data={data} />)
    const input = screen.getByPlaceholderText("Search questions...") as HTMLInputElement
    expect(input).toBeInTheDocument()

    // Filter to "Two Sum"
    fireEvent.change(input, { target: { value: "Two Sum" } })
    await waitFor(() => {
    expect(screen.getByText("Two Sum")).toBeInTheDocument()
    expect(screen.queryByText("Palindrome")).not.toBeInTheDocument()})
  })

  test("dropdown filter sets difficulty filter", async () => {
    render(<DataTable columns={columns} data={data} />)
    const easyFilter = screen.getByTestId("filter-easy")
    fireEvent.click(easyFilter)


    // Only medium row should be visible
    await waitFor(() => {
        expect(screen.getByText("Two Sum")).toBeInTheDocument()
        expect(screen.queryByText("Palindrome")).not.toBeInTheDocument()
      })
  })
})