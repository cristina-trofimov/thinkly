import { render, screen, fireEvent } from "@testing-library/react";
import { CompetitionCard } from "../src/components/leaderboards/CompetitionCard";
import { Competition } from "../src/components/interfaces/Competition";

const mockCompetition: Competition = {
  id: "1",
  name: "Test Challenge",
  date: "2025-10-20",
  participants: [
    { username: "Alice", total_score: 1200, problems_solved: 10, user_id: 1, rank: 1},
  ],
};

describe("CompetitionCard", () => {
  it("renders competition name and date", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    expect(screen.getByText("Test Challenge")).toBeInTheDocument();
    expect(screen.getByText("2025-10-20")).toBeInTheDocument();
  });

  it("toggles open and close on header click", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    const header = screen.getByText("Test Challenge");
    fireEvent.click(header);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});
