import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { DataTable } from "../src/components/questionsTable/questionDataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { Question } from "../src/types/questions/Question.type"

// Mock useAnalytics hook
jest.mock("../src/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackQuestionClicked: jest.fn(),
    trackQuestionSearched: jest.fn(),
    trackQuestionFilteredByDifficulty: jest.fn(),
  }),
}))

// Mock Button, Input, DropdownMenu components (if needed)
jest.mock("../src/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => "",
}))

jest.mock("../src/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}))

jest.mock("../src/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <div {...props} onClick={onClick}>
      {children}
    </div>),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div>---</div>,
}))

jest.mock("../src/components/ui/pagination", () => ({
  Pagination: ({ children }: any) => <nav>{children}</nav>,
  PaginationContent: ({ children }: any) => <div>{children}</div>,
  PaginationEllipsis: () => <span>...</span>,
  PaginationItem: ({ children }: any) => <div>{children}</div>,
  PaginationLink: ({ children, onClick, isActive, ...props }: any) => (
    <button type="button" onClick={onClick} data-active={isActive ? "true" : "false"} {...props}>
      {children}
    </button>
  ),
  PaginationNext: ({ onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      Next
    </button>
  ),
  PaginationPrevious: ({ onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      Previous
    </button>
  ),
}))

jest.mock("../src/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: () => <span />,
}))

// Sample columns and data
const columns: ColumnDef<Question, any>[] = [
  { accessorKey: "question_name", header: "Question Title" },
  { accessorKey: "difficulty", header: "Difficulty" },
]

const data: Question[] = [
  {
    question_id: 1,
    question_name: "Two Sum",
    difficulty: "Easy",
    question_description: "Test description",
    media: "",
    preset_code: "",
    template_solution: "",
    to_string_function: "",
    from_string_function: "",
    created_at: new Date("2024-01-01"),
    last_modified_at: new Date("2024-01-01"),
  },
  {
    question_id: 2,
    question_name: "Palindrome",
    difficulty: "Medium",
    question_description: "Test description",
    media: "",
    preset_code: "",
    template_solution: "",
    to_string_function: "",
    from_string_function: "",
    created_at: new Date("2024-01-02"),
    last_modified_at: new Date("2024-01-01"),
  },
]

describe("DataTable", () => {
  const defaultProps = {
    total: data.length,
    page: 1,
    pageSize: 25,
    search: "",
    difficultyFilter: "all" as const,
    onSearchChange: jest.fn(),
    onDifficultyFilterChange: jest.fn(),
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("renders column headers", () => {
    render(
      <MemoryRouter><DataTable columns={columns} data={data} {...defaultProps} /></MemoryRouter>
    )
    expect(screen.getByText("Question Title")).toBeInTheDocument()
    expect(screen.getByText("Difficulty")).toBeInTheDocument()
  })

  test("renders all rows", () => {
    render(
      <MemoryRouter><DataTable columns={columns} data={data} {...defaultProps} /></MemoryRouter>
    )
    expect(screen.getByText("Two Sum")).toBeInTheDocument()
    expect(screen.getByText("Palindrome")).toBeInTheDocument()
    const easyElements = screen.getAllByText("Easy")
    expect(easyElements.length).toBeGreaterThan(0)
    const mediumElements = screen.getAllByText("Medium")
    expect(mediumElements.length).toBeGreaterThan(0)
  })

  test("shows 'No results.' when data is empty", () => {
    render(
      <MemoryRouter><DataTable columns={columns} data={[]} {...defaultProps} /></MemoryRouter>
    )
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  test("search input sends the search value to the parent", async () => {
    const onSearchChange = jest.fn()
    render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          onSearchChange={onSearchChange}
        />
      </MemoryRouter>
    )
    const input = screen.getByPlaceholderText("Search questions...") as HTMLInputElement
    expect(input).toBeInTheDocument()

    fireEvent.change(input, { target: { value: "Two Sum" } })
    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith("Two Sum")
    })
  })

  test("dropdown filter sends the difficulty value to the parent", async () => {
    const onDifficultyFilterChange = jest.fn()
    render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          onDifficultyFilterChange={onDifficultyFilterChange}
        />
      </MemoryRouter>
    )
    const easyFilter = screen.getByTestId("filter-easy")
    fireEvent.click(easyFilter)

    await waitFor(() => {
      expect(onDifficultyFilterChange).toHaveBeenCalledWith("easy")
    })
  })
})
