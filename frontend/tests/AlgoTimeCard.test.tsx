import { render, screen } from "@testing-library/react";
import { AlgoTimeCard } from "../src/components/leaderboards/AlgoTimeCard";
import type { Participant } from "../src/types/account/Participant.type";

// Mock the AlgoTimeDataTable component
jest.mock("../src/components/leaderboards/AlgoTimeDataTable", () => ({
  AlgoTimeDataTable: jest.fn(({ participants, currentUserId }) => (
    <div data-testid="algo-time-data-table">
      Mock Table: {participants.length} participants
      {currentUserId && ` | Current User: ${currentUserId}`}
    </div>
  )),
}));

// Mock shadcn/ui components
jest.mock("../src/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h2 data-testid="card-title" className={className}>
      {children}
    </h2>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

describe("AlgoTimeCard", () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the card with header and content when participants are provided", () => {
      render(<AlgoTimeCard participants={mockParticipants} />);

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("card-header")).toBeInTheDocument();
      expect(screen.getByTestId("card-title")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });

    it("should display correct title and subtitle", () => {
      render(<AlgoTimeCard participants={mockParticipants} />);

      expect(screen.getByText("AlgoTime Leaderboard")).toBeInTheDocument();
      expect(screen.getByText("All-time rankings")).toBeInTheDocument();
    });

    it("should render AlgoTimeDataTable with correct props", () => {
      const currentUserId = 2;
      render(
        <AlgoTimeCard
          participants={mockParticipants}
          currentUserId={currentUserId}
        />
      );

      const table = screen.getByTestId("algo-time-data-table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveTextContent("Mock Table: 3 participants");
      expect(table).toHaveTextContent("Current User: 2");
    });

    it("should render AlgoTimeDataTable without currentUserId when not provided", () => {
      render(<AlgoTimeCard participants={mockParticipants} />);

      const table = screen.getByTestId("algo-time-data-table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveTextContent("Mock Table: 3 participants");
      expect(table).not.toHaveTextContent("Current User:");
    });
  });

  describe("Edge Cases", () => {
    it("should return null when participants array is empty", () => {
      const { container } = render(<AlgoTimeCard participants={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it("should return null when participants is undefined", () => {
      const { container } = render(
        <AlgoTimeCard participants={undefined as any} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should return null when participants is null", () => {
      const { container } = render(
        <AlgoTimeCard participants={null as any} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Styling", () => {
    it("should apply correct CSS classes to card", () => {
      render(<AlgoTimeCard participants={mockParticipants} />);

      const card = screen.getByTestId("card");
      expect(card).toHaveClass(
        "mb-6",
        "shadow-sm",
        "border",
        "border-[#8065CD]",
        "bg-white"
      );
    });

    it("should apply correct CSS classes to card title", () => {
      render(<AlgoTimeCard participants={mockParticipants} />);

      const title = screen.getByTestId("card-title");
      expect(title).toHaveClass("text-lg", "font-semibold", "text-[#8065CD]");
    });

    it("should apply correct CSS classes to card content", () => {
      render(<AlgoTimeCard participants={mockParticipants} />);

      const content = screen.getByTestId("card-content");
      expect(content).toHaveClass(
        "overflow-x-auto",
        "p-6",
        "bg-white",
        "border-t"
      );
    });
  });

  describe("Single Participant", () => {
    it("should render correctly with a single participant", () => {
      const singleParticipant = [mockParticipants[0]];
      render(<AlgoTimeCard participants={singleParticipant} />);

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent(
        "Mock Table: 1 participants"
      );
    });
  });

  describe("Large Dataset", () => {
    it("should handle a large number of participants", () => {
      const largeParticipantList: Participant[] = Array.from(
        { length: 100 },
        (_, i) => ({
          user_id: i + 1,
          name: `User ${i + 1}`,
          rank: i + 1,
          total_score: 1000 - i * 10,
          problems_solved: 20 - Math.floor(i / 5),
          total_time: `${Math.floor(i / 6)}:${i % 60}:00`,
        })
      );

      render(<AlgoTimeCard participants={largeParticipantList} />);

      expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent(
        "Mock Table: 100 participants"
      );
    });
  });
});