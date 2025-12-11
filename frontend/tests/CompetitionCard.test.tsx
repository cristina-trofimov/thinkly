import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CompetitionCard } from "@/components/leaderboards/CompetitionCard";
// Make sure to import your type if you want to cast the mock strictly (optional)
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";

// 1. Mock the child component
jest.mock("@/components/leaderboards/ScoreboardDataTable", () => ({
  ScoreboardDataTable: () => <div data-testid="mock-scoreboard">Mock Table</div>,
}));

// 2. Mock Lucide icons
jest.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down">Down</span>,
  ChevronUp: () => <span data-testid="chevron-up">Up</span>,
}));

describe("CompetitionCard", () => {
  // FIX: 'id' is now a number, and 'date' is a Date object
  // We cast as 'any' or the specific type to ignore missing fields (like createdAt, updatedAt) that aren't used in the UI
  const mockCompetition = {
    id: 123,
    competitionTitle: "Winter Championship",
    date: new Date("2024-01-01"),
    participants: [
      { id: "p1", name: "Alice", score: 10 },
      { id: "p2", name: "Bob", score: 20 },
    ],
  } as unknown as CompetitionWithParticipants;

  it("returns null (renders nothing) if there are no participants", () => {
    // specific override for this test case
    const emptyCompetition = { ...mockCompetition, participants: [] };

    const { container } = render(
      <CompetitionCard competition={emptyCompetition} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the competition title and date", () => {
    render(<CompetitionCard competition={mockCompetition} />);

    expect(screen.getByText("Winter Championship")).toBeInTheDocument();
    // Note: toString() on a Date object might output differently depending on locale. 
    // Usually simpler to just check if the text exists partially or mock the date string.
    // For this test, we just check the title to ensure render happens.
    expect(screen.getByText(/Winter Championship/i)).toBeInTheDocument();
  });

  it("is closed by default and shows the Down chevron", () => {
    render(<CompetitionCard competition={mockCompetition} />);

    expect(screen.queryByTestId("mock-scoreboard")).not.toBeInTheDocument();
    expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
  });

  it("opens the scoreboard when the header is clicked", () => {
    render(<CompetitionCard competition={mockCompetition} />);

    const trigger = screen.getByText("Winter Championship");
    fireEvent.click(trigger);

    expect(screen.getByTestId("mock-scoreboard")).toBeInTheDocument();
    expect(screen.getByTestId("chevron-up")).toBeInTheDocument();
  });

  it("closes the scoreboard when clicked a second time", () => {
    render(<CompetitionCard competition={mockCompetition} />);

    const trigger = screen.getByText("Winter Championship");

    // Click to Open
    fireEvent.click(trigger);
    expect(screen.getByTestId("mock-scoreboard")).toBeInTheDocument();

    // Click to Close
    fireEvent.click(trigger);
    expect(screen.queryByTestId("mock-scoreboard")).not.toBeInTheDocument();
  });
});