import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { DataTable } from "../src/components/questionsTable/questionDataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { Question } from "../src/types/questions/Question.type"

const mockTrackQuestionClicked = jest.fn()
const mockTrackQuestionSearched = jest.fn()
const mockTrackQuestionFilteredByDifficulty = jest.fn()
const mockNavigate = jest.fn()

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

// Mock useAnalytics hook
jest.mock("../src/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackQuestionClicked: mockTrackQuestionClicked,
    trackQuestionSearched: mockTrackQuestionSearched,
    trackQuestionFilteredByDifficulty: mockTrackQuestionFilteredByDifficulty,
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
  Select: ({ children, onValueChange }: any) => (
    <div>
      {children}
      <button type="button" data-testid="select-page-size-50" onClick={() => onValueChange?.("50")}>
        choose 50
      </button>
    </div>
  ),
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

  afterEach(() => {
    jest.useRealTimers()
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
    expect(mockTrackQuestionFilteredByDifficulty).toHaveBeenCalledWith("easy")
  })

  test("shows the selected difficulty label in the filter button", () => {
    render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          difficultyFilter="medium"
        />
      </MemoryRouter>
    )

    expect(screen.getByRole("button", { name: /medium/i })).toBeInTheDocument()
  })

  test("tracks debounced search analytics with trimmed values", () => {
    jest.useFakeTimers()

    render(
      <MemoryRouter>
        <DataTable columns={columns} data={data} {...defaultProps} />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText("Search questions...")
    fireEvent.change(input, { target: { value: "  Two Sum  " } })

    expect(mockTrackQuestionSearched).not.toHaveBeenCalled()
    jest.advanceTimersByTime(600)

    expect(mockTrackQuestionSearched).toHaveBeenCalledWith("Two Sum")
  })

  test("does not track blank searches", () => {
    jest.useFakeTimers()

    render(
      <MemoryRouter>
        <DataTable columns={columns} data={data} {...defaultProps} />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText("Search questions..."), {
      target: { value: "   " },
    })

    jest.advanceTimersByTime(600)
    expect(mockTrackQuestionSearched).not.toHaveBeenCalled()
  })

  test("tracks question clicks and navigates to the coding page", () => {
    render(
      <MemoryRouter>
        <DataTable columns={columns} data={data} {...defaultProps} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Two Sum"))

    expect(mockTrackQuestionClicked).toHaveBeenCalledWith("Two Sum", "Easy", 1)
    expect(mockNavigate).toHaveBeenCalledWith("/app/code/Two Sum", {
      state: {
        fromFeed: true,
        problem: data[0],
      },
    })
  })

  test("calls onPageChange from pagination controls and page links", () => {
    const onPageChange = jest.fn()

    render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          total={100}
          page={5}
          pageSize={10}
          onPageChange={onPageChange}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Previous"))
    fireEvent.click(screen.getByText("Next"))
    fireEvent.click(screen.getByText("6"))

    expect(onPageChange).toHaveBeenCalledWith(4)
    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  test("prevents pagination from going below page 1 or above the last page", () => {
    const onPageChange = jest.fn()

    const { rerender } = render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          total={20}
          page={1}
          pageSize={10}
          onPageChange={onPageChange}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Previous"))
    expect(onPageChange).toHaveBeenCalledWith(1)

    rerender(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          total={20}
          page={2}
          pageSize={10}
          onPageChange={onPageChange}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Next"))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  test("calls onPageSizeChange when a page size is selected", () => {
    const onPageSizeChange = jest.fn()

    render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          onPageSizeChange={onPageSizeChange}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId("select-page-size-50"))
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  test("renders ellipsis for middle pagination ranges", () => {
    render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={data}
          {...defaultProps}
          total={100}
          page={5}
          pageSize={10}
        />
      </MemoryRouter>
    )

    expect(screen.getAllByText("...")).toHaveLength(2)
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("6")).toBeInTheDocument()
  })
})
