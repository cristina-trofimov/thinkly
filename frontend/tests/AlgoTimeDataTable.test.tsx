import { render, screen, fireEvent } from "@testing-library/react";
import { AlgoTimeDataTable } from "../src/components/leaderboards/AlgoTimeDataTable";
import type { Participant } from "../src/types/account/Participant.type";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("lucide-react", () => ({
  Hash: () => <span data-testid="hash-icon">Hash</span>,
  User: () => <span data-testid="user-icon">User</span>,
  Star: () => <span data-testid="star-icon">Star</span>,
  ListChecks: () => <span data-testid="listchecks-icon">ListChecks</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  ChevronLeft: () => <span data-testid="chevron-left-icon">ChevronLeft</span>,
  ChevronRight: () => <span data-testid="chevron-right-icon">ChevronRight</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
}));

jest.mock("../src/components/ui/NumberCircle", () => ({
  NumberCircle: ({ number }: { number: number }) => (
    <span data-testid={`number-circle-${number}`}>{number}</span>
  ),
}));

jest.mock("../src/components/ui/table", () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children, className }: any) => (
    <tr className={className}>{children}</tr>
  ),
  TableCell: ({ children, colSpan, className }: any) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures & helpers
// ---------------------------------------------------------------------------

const mockParticipants: Participant[] = [
  { user_id: 1, name: "Alice Smith", rank: 1, total_score: 1500, problems_solved: 25, total_time: "10:30:45" },
  { user_id: 2, name: "Bob Johnson", rank: 2, total_score: 1200, problems_solved: 20, total_time: "08:15:30" },
  { user_id: 3, name: "Charlie Brown", rank: 3, total_score: 1000, problems_solved: 18, total_time: "07:45:20" },
];

/**
 * AlgoTimeDataTable is a pure controlled component — all state lives in the
 * parent (AlgoTimeCard). Tests must supply every required prop and assert that
 * the component (a) renders the data it receives and (b) fires the correct
 * callbacks when the user interacts.
 */
const defaultProps = {
  search: "",
  onSearchChange: jest.fn(),
  page: 1,
  totalPages: 1,
  total: mockParticipants.length,
  onPageChange: jest.fn(),
};

function renderTable(
  participants: Participant[] = mockParticipants,
  overrides: Partial<typeof defaultProps> = {},
  currentUserId?: number,
) {
  const props = { ...defaultProps, ...overrides, participants, currentUserId };
  return render(<AlgoTimeDataTable {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Rendering", () => {
  it("renders the table with all column headers", () => {
    renderTable();
    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.getByTestId("hash-icon")).toBeInTheDocument();
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
    expect(screen.getByTestId("star-icon")).toBeInTheDocument();
    expect(screen.getByTestId("listchecks-icon")).toBeInTheDocument();
    expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
  });

  it("renders all participant data from the participants prop", () => {
    renderTable();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("renders a NumberCircle for each participant rank", () => {
    renderTable();
    expect(screen.getByTestId("number-circle-1")).toBeInTheDocument();
    expect(screen.getByTestId("number-circle-2")).toBeInTheDocument();
    expect(screen.getByTestId("number-circle-3")).toBeInTheDocument();
  });

  it("shows 'No participants found' when participants is empty and search is empty", () => {
    renderTable([], { search: "", total: 0 });
    expect(screen.getByText("No participants found")).toBeInTheDocument();
  });

  it("shows 'No participants match your search' when participants is empty and search is non-empty", () => {
    renderTable([], { search: "NonexistentUser", total: 0 });
    expect(screen.getByText("No participants match your search")).toBeInTheDocument();
  });

  it("shows a loading row when loading=true", () => {
    renderTable([], { ...defaultProps, total: 0 }, undefined);
    // Override with loading=true
    render(
      <AlgoTimeDataTable
        {...defaultProps}
        participants={[]}
        loading={true}
      />
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the correct number of rows", () => {
    const { container } = renderTable();
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(mockParticipants.length);
  });

  it("respects the participants prop — renders exactly what is passed", () => {
    const oneParticipant = [mockParticipants[0]];
    const { container } = renderTable(oneParticipant, { total: 1 });
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(1);
  });

  it("renders name cells with font-medium class", () => {
    const { container } = renderTable();
    const nameCell = container.querySelector("tbody tr:first-child td:nth-child(2) span");
    expect(nameCell).toHaveClass("font-medium");
  });
});

// ---------------------------------------------------------------------------
// Search input — controlled; calls onSearchChange callback
// ---------------------------------------------------------------------------

describe("Search input", () => {
  it("renders the search input", () => {
    renderTable();
    expect(screen.getByPlaceholderText("Search by name...")).toBeInTheDocument();
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  it("displays the value from the search prop", () => {
    renderTable(mockParticipants, { search: "Alice" });
    const input = screen.getByPlaceholderText("Search by name...") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("calls onSearchChange with the typed value when the user types", () => {
    const onSearchChange = jest.fn();
    renderTable(mockParticipants, { onSearchChange });
    fireEvent.change(screen.getByPlaceholderText("Search by name..."), {
      target: { value: "Alice" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("Alice");
  });

  it("calls onSearchChange with an empty string when the input is cleared", () => {
    const onSearchChange = jest.fn();
    renderTable(mockParticipants, { search: "Alice", onSearchChange });
    fireEvent.change(screen.getByPlaceholderText("Search by name..."), {
      target: { value: "" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("shows correct empty message when search prop is set and participants is empty", () => {
    renderTable([], { search: "xyz", total: 0 });
    expect(screen.getByText("No participants match your search")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Pagination controls — controlled; calls onPageChange callback
// ---------------------------------------------------------------------------

describe("Pagination controls", () => {
  it("does NOT render pagination when totalPages is 1", () => {
    renderTable(mockParticipants, { totalPages: 1 });
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
  });

  it("renders pagination controls when totalPages > 1", () => {
    renderTable(mockParticipants, { totalPages: 3, page: 1 });
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Last")).toBeInTheDocument();
  });

  it("clicking Next calls onPageChange with page + 1", () => {
    const onPageChange = jest.fn();
    renderTable(mockParticipants, { totalPages: 3, page: 1, onPageChange });
    const nextBtn = screen.getByTestId("chevron-right-icon").parentElement!;
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("clicking Prev calls onPageChange with page - 1", () => {
    const onPageChange = jest.fn();
    renderTable(mockParticipants, { totalPages: 3, page: 2, onPageChange });
    const prevBtn = screen.getByTestId("chevron-left-icon").parentElement!;
    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("clicking First calls onPageChange with 1", () => {
    const onPageChange = jest.fn();
    renderTable(mockParticipants, { totalPages: 3, page: 3, onPageChange });
    fireEvent.click(screen.getByText("First"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("clicking Last calls onPageChange with totalPages", () => {
    const onPageChange = jest.fn();
    renderTable(mockParticipants, { totalPages: 4, page: 1, onPageChange });
    fireEvent.click(screen.getByText("Last"));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("disables First and Prev on page 1", () => {
    renderTable(mockParticipants, { totalPages: 3, page: 1 });
    expect(screen.getByText("First")).toBeDisabled();
    expect(screen.getByTestId("chevron-left-icon").parentElement).toBeDisabled();
  });

  it("disables Next and Last on the last page", () => {
    renderTable(mockParticipants, { totalPages: 3, page: 3 });
    expect(screen.getByText("Last")).toBeDisabled();
    expect(screen.getByTestId("chevron-right-icon").parentElement).toBeDisabled();
  });

  it("displays total result count alongside page info when search is active", () => {
    renderTable(mockParticipants, {
      totalPages: 2,
      page: 1,
      total: 17,
      search: "Alice",
    });
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText(/17 results/)).toBeInTheDocument();
  });

  it("does not show result count when search is empty", () => {
    renderTable(mockParticipants, { totalPages: 2, page: 1, total: 30, search: "" });
    expect(screen.queryByText(/results/)).not.toBeInTheDocument();
  });

  it("disables navigation buttons when loading is true", () => {
    render(
      <AlgoTimeDataTable
        {...defaultProps}
        participants={mockParticipants}
        totalPages={3}
        page={2}
        loading={true}
      />
    );
    expect(screen.getByText("First")).toBeDisabled();
    expect(screen.getByText("Last")).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Row highlighting
// ---------------------------------------------------------------------------

describe("Row highlighting", () => {
  it("applies current-user highlight to the matching row", () => {
    const { container } = renderTable(mockParticipants, {}, 2);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[1]).toHaveClass("bg-primary/20", "border-t-2", "border-b-2", "border-primary", "font-semibold");
  });

  it("applies gold podium color to rank-1 row when not the current user", () => {
    const { container } = renderTable(mockParticipants, {}, undefined);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveClass("bg-yellow-100");
  });

  it("applies silver podium color to rank-2 row", () => {
    const { container } = renderTable(mockParticipants, {}, undefined);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[1]).toHaveClass("bg-muted");
  });

  it("applies bronze podium color to rank-3 row", () => {
    const { container } = renderTable(mockParticipants, {}, undefined);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[2]).toHaveClass("bg-orange-100");
  });

  it("no podium color for rows with rank > 3", () => {
    const lowerRanked: Participant[] = [
      { user_id: 10, name: "Dave", rank: 5, total_score: 800, problems_solved: 10, total_time: "05:00:00" },
    ];
    const { container } = renderTable(lowerRanked, { total: 1 });
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]).not.toHaveClass("bg-yellow-100", "bg-gray-100", "bg-orange-100");
  });

  it("prioritises current-user highlight over podium colour for rank-1 user", () => {
    const { container } = renderTable(mockParticipants, {}, 1);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveClass("bg-primary/20");
    expect(rows[0]).not.toHaveClass("bg-yellow-100");
  });

  it("applies podium colours to rank-1 entry regardless of search being active", () => {
    // The table renders whatever participants it receives; rank colouring is always applied.
    // Filtering happens on the backend — if rank-1 matches the search, they keep their colour.
    const { container } = renderTable([mockParticipants[0]], { search: "Alice", total: 1 });
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveClass("bg-yellow-100");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("renders participants with special characters in names", () => {
    const special: Participant[] = [
      { user_id: 1, name: "O'Brien", rank: 1, total_score: 100, problems_solved: 5, total_time: "01:00:00" },
      { user_id: 2, name: "José García", rank: 2, total_score: 90, problems_solved: 4, total_time: "00:50:00" },
    ];
    renderTable(special, { total: 2 });
    expect(screen.getByText("O'Brien")).toBeInTheDocument();
    expect(screen.getByText("José García")).toBeInTheDocument();
  });

  it("renders participants with very long names", () => {
    const long: Participant[] = [
      { user_id: 1, name: "Very Long Name That Goes On And On And On", rank: 1, total_score: 100, problems_solved: 5, total_time: "01:00:00" },
    ];
    renderTable(long, { total: 1 });
    expect(screen.getByText("Very Long Name That Goes On And On And On")).toBeInTheDocument();
  });

  it("renders rows with zero scores and zero problems correctly", () => {
    const zeroes: Participant[] = [
      { user_id: 1, name: "Zero User", rank: 1, total_score: 0, problems_solved: 0, total_time: "00:00:00" },
    ];
    const { container } = renderTable(zeroes, { total: 1 });
    const cells = container.querySelectorAll("tbody tr td");
    expect(cells[2]).toHaveTextContent("0"); // total_score
    expect(cells[3]).toHaveTextContent("0"); // problems_solved
  });
});