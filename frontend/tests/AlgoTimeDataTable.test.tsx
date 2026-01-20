import { render, screen, fireEvent, within } from "@testing-library/react";
import { AlgoTimeDataTable } from "../src/components/leaderboards/AlgoTimeDataTable";
import type { Participant } from "../src/types/account/Participant.type";

// Mock lucide-react icons
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

// Mock NumberCircle component
jest.mock("../src/components/ui/NumberCircle", () => ({
  NumberCircle: ({ number }: { number: number }) => (
    <span data-testid={`number-circle-${number}`}>{number}</span>
  ),
}));

// Mock shadcn/ui table components
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

describe("AlgoTimeDataTable", () => {
  const createMockParticipants = (count: number): Participant[] => {
    return Array.from({ length: count }, (_, i) => ({
      user_id: i + 1,
      name: `User ${i + 1}`,
      rank: i + 1,
      total_score: 1000 - i * 10,
      problems_solved: 20 - Math.floor(i / 5),
      total_time: `${Math.floor(i / 6)}:${i % 60}:00`,
    }));
  };

  const mockParticipants: Participant[] = [
    {
      user_id: 1,
      name: "Alice Smith",
      rank: 1,
      total_score: 1500,
      problems_solved: 25,
      total_time: "10:30:45",
    },
    {
      user_id: 2,
      name: "Bob Johnson",
      rank: 2,
      total_score: 1200,
      problems_solved: 20,
      total_time: "08:15:30",
    },
    {
      user_id: 3,
      name: "Charlie Brown",
      rank: 3,
      total_score: 1000,
      problems_solved: 18,
      total_time: "07:45:20",
    },
  ];

  describe("Rendering", () => {
    it("should render the table with all columns", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      expect(screen.getByTestId("table")).toBeInTheDocument();
      expect(screen.getByTestId("hash-icon")).toBeInTheDocument();
      expect(screen.getByTestId("user-icon")).toBeInTheDocument();
      expect(screen.getByTestId("star-icon")).toBeInTheDocument();
      expect(screen.getByTestId("listchecks-icon")).toBeInTheDocument();
      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    });

    it("should render all participant data", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.getByText("1500")).toBeInTheDocument();
      expect(screen.getByText("1200")).toBeInTheDocument();
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    it("should render NumberCircle for each rank", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      expect(screen.getByTestId("number-circle-1")).toBeInTheDocument();
      expect(screen.getByTestId("number-circle-2")).toBeInTheDocument();
      expect(screen.getByTestId("number-circle-3")).toBeInTheDocument();
    });

    it("should display empty state when no participants", () => {
      render(<AlgoTimeDataTable participants={[]} />);

      expect(screen.getByText("No participants found")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("should render search input", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      const searchInput = screen.getByPlaceholderText("Search by name...");
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should filter participants by name", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      const searchInput = screen.getByPlaceholderText("Search by name...");
      fireEvent.change(searchInput, { target: { value: "Alice" } });

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.queryByText("Bob Johnson")).not.toBeInTheDocument();
      expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
    });

    it("should be case-insensitive", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      const searchInput = screen.getByPlaceholderText("Search by name...");
      fireEvent.change(searchInput, { target: { value: "alice" } });

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    it("should show no results message when search yields no matches", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      const searchInput = screen.getByPlaceholderText("Search by name...");
      fireEvent.change(searchInput, { target: { value: "NonexistentUser" } });

      expect(screen.getByText("No participants match your search")).toBeInTheDocument();
    });

    it("should reset to first page when search query changes", () => {
      const manyParticipants = createMockParticipants(30);
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      // Verify we're on page 1 initially
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

      // Go to page 2
      const nextButton = screen.getByTestId("chevron-right-icon").parentElement!;
      fireEvent.click(nextButton);

      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

      // Search for something - 11 results will fit on 1 page, so pagination disappears
      const searchInput = screen.getByPlaceholderText("Search by name...");
      fireEvent.change(searchInput, { target: { value: "User 1" } });

      // Verify search results are displayed (User 1, User 10-19)
      expect(screen.getByText("User 1")).toBeInTheDocument();
      expect(screen.getByText("User 10")).toBeInTheDocument();

      // Pagination should not be visible (11 results fit on 1 page)
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });

    it("should clear search when input is cleared", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      const searchInput = screen.getByPlaceholderText("Search by name...");

      // Search for Alice
      fireEvent.change(searchInput, { target: { value: "Alice" } });
      expect(screen.queryByText("Bob Johnson")).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    const manyParticipants = createMockParticipants(30);

    it("should not show pagination controls when there's only one page", () => {
      render(<AlgoTimeDataTable participants={mockParticipants} />);

      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
      expect(screen.queryByText("First")).not.toBeInTheDocument();
    });

    it("should show pagination controls when there are multiple pages", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Last")).toBeInTheDocument();
    });

    it("should navigate to next page", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      const nextButton = screen.getByTestId("chevron-right-icon").parentElement!;
      fireEvent.click(nextButton);

      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });

    it("should navigate to previous page", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      const nextButton = screen.getByTestId("chevron-right-icon").parentElement!;
      const prevButton = screen.getByTestId("chevron-left-icon").parentElement!;

      fireEvent.click(nextButton);
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

      fireEvent.click(prevButton);
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("should navigate to first page", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      const lastButton = screen.getByText("Last");
      fireEvent.click(lastButton);

      const firstButton = screen.getByText("First");
      fireEvent.click(firstButton);

      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("should navigate to last page", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      const lastButton = screen.getByText("Last");
      fireEvent.click(lastButton);

      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });

    it("should disable previous buttons on first page", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      const firstButton = screen.getByText("First");
      const prevButton = screen.getByTestId("chevron-left-icon").parentElement!;

      expect(firstButton).toBeDisabled();
      expect(prevButton).toBeDisabled();
    });

    it("should disable next buttons on last page", () => {
      render(<AlgoTimeDataTable participants={manyParticipants} />);

      const lastButton = screen.getByText("Last");
      fireEvent.click(lastButton);

      const nextButton = screen.getByTestId("chevron-right-icon").parentElement!;

      expect(lastButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it("should display result count when searching with multiple pages", () => {
      // Create enough participants so "User 2" search gives us >15 results (User 2, User 20-29 = 11 results on 1 page)
      // Instead, search for just "User" which will match all 30, requiring pagination
      const evenMoreParticipants = createMockParticipants(50);
      render(<AlgoTimeDataTable participants={evenMoreParticipants} />);

      const searchInput = screen.getByPlaceholderText("Search by name...");
      // Search for "User 2" which matches User 2, User 20-29 (11 results, fits on 1 page - no pagination)
      // Search for "User" instead - all 50 match, requiring multiple pages
      fireEvent.change(searchInput, { target: { value: "User 2" } });

      // User 2, User 20-29 = 11 results, fits on one page, no pagination
      expect(screen.queryByText(/results/)).not.toBeInTheDocument();

      // Now search for something that requires multiple pages
      fireEvent.change(searchInput, { target: { value: "User" } });

      // All 50 users match, should show pagination with result count
      // Use regex matcher since text is broken up by elements
      expect(screen.getByText(/Page\s+1\s+of\s+4/)).toBeInTheDocument();
      expect(screen.getByText(/\(50 results\)/)).toBeInTheDocument();
    });
  });

  describe("Row Highlighting", () => {
    it("should highlight current user's row", () => {
      const { container } = render(
        <AlgoTimeDataTable participants={mockParticipants} currentUserId={2} />
      );

      const rows = container.querySelectorAll("tbody tr");
      const bobRow = rows[1]; // Bob is the second row

      expect(bobRow).toHaveClass(
        "bg-[#8065CD]/20",
        "border-t-2",
        "border-b-2",
        "border-[#8065CD]",
        "font-semibold"
      );
    });

    it("should apply podium colors on first page without search", () => {
      const { container } = render(
        <AlgoTimeDataTable participants={mockParticipants} />
      );

      const rows = container.querySelectorAll("tbody tr");

      expect(rows[0]).toHaveClass("bg-yellow-100"); // 1st place
      expect(rows[1]).toHaveClass("bg-gray-100");   // 2nd place
      expect(rows[2]).toHaveClass("bg-orange-100"); // 3rd place
    });

    it("should not apply podium colors on second page", () => {
      const manyParticipants = createMockParticipants(30);
      const { container } = render(
        <AlgoTimeDataTable participants={manyParticipants} />
      );

      const nextButton = screen.getByTestId("chevron-right-icon").parentElement!;
      fireEvent.click(nextButton);

      const rows = container.querySelectorAll("tbody tr");

      // No rows on page 2 should have podium colors
      expect(rows[0]).not.toHaveClass("bg-yellow-100");
      expect(rows[0]).not.toHaveClass("bg-gray-100");
      expect(rows[0]).not.toHaveClass("bg-orange-100");
    });

    it("should not apply podium colors when searching", () => {
      const { container } = render(
        <AlgoTimeDataTable participants={mockParticipants} />
      );

      const searchInput = screen.getByPlaceholderText("Search by name...");
      fireEvent.change(searchInput, { target: { value: "Alice" } });

      const rows = container.querySelectorAll("tbody tr");

      // Should not have podium color when filtering
      expect(rows[0]).not.toHaveClass("bg-yellow-100");
    });

    it("should prioritize current user highlight over podium colors", () => {
      const { container } = render(
        <AlgoTimeDataTable participants={mockParticipants} currentUserId={1} />
      );

      const rows = container.querySelectorAll("tbody tr");
      const aliceRow = rows[0];

      // Should have current user styling, not podium styling
      expect(aliceRow).toHaveClass("bg-[#8065CD]/20");
      expect(aliceRow).not.toHaveClass("bg-yellow-100");
    });
  });

  describe("Edge Cases", () => {
    it("should handle participants with special characters in names", () => {
      const specialParticipants: Participant[] = [
        {
          user_id: 1,
          name: "O'Brien",
          rank: 1,
          total_score: 100,
          problems_solved: 5,
          total_time: "01:00:00",
        },
        {
          user_id: 2,
          name: "José García",
          rank: 2,
          total_score: 90,
          problems_solved: 4,
          total_time: "00:50:00",
        },
      ];

      render(<AlgoTimeDataTable participants={specialParticipants} />);

      expect(screen.getByText("O'Brien")).toBeInTheDocument();
      expect(screen.getByText("José García")).toBeInTheDocument();
    });

    it("should handle very long names", () => {
      const longNameParticipants: Participant[] = [
        {
          user_id: 1,
          name: "Very Long Name That Goes On And On And On",
          rank: 1,
          total_score: 100,
          problems_solved: 5,
          total_time: "01:00:00",
        },
      ];

      render(<AlgoTimeDataTable participants={longNameParticipants} />);

      expect(
        screen.getByText("Very Long Name That Goes On And On And On")
      ).toBeInTheDocument();
    });

    it("should handle zero scores and problems", () => {
      const zeroParticipants: Participant[] = [
        {
          user_id: 1,
          name: "Zero User",
          rank: 1,
          total_score: 0,
          problems_solved: 0,
          total_time: "00:00:00",
        },
      ];

      const { container } = render(<AlgoTimeDataTable participants={zeroParticipants} />);

      expect(screen.getByText("Zero User")).toBeInTheDocument();

      // Use container to find the specific cells with 0 values
      const rows = container.querySelectorAll("tbody tr");
      const cells = rows[0].querySelectorAll("td");

      // Check total_score cell (index 2) and problems_solved cell (index 3)
      expect(cells[2]).toHaveTextContent("0"); // total_score
      expect(cells[3]).toHaveTextContent("0"); // problems_solved
    });
  });

  describe("Table Structure", () => {
    it("should render correct number of rows", () => {
      const { container } = render(
        <AlgoTimeDataTable participants={mockParticipants} />
      );

      const rows = container.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(mockParticipants.length);
    });

    it("should display 15 rows per page maximum", () => {
      const twentyParticipants = createMockParticipants(20);
      const { container } = render(
        <AlgoTimeDataTable participants={twentyParticipants} />
      );

      const rows = container.querySelectorAll("tbody tr");
      expect(rows.length).toBeLessThanOrEqual(15);
    });

    it("should render name cells with font-medium class", () => {
      const { container } = render(
        <AlgoTimeDataTable participants={mockParticipants} />
      );

      const aliceName = container.querySelector("tbody tr:first-child td:nth-child(2) span");
      expect(aliceName).toHaveClass("font-medium");
    });
  });
});