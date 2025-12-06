import { render, screen, fireEvent } from "@testing-library/react";
import { CompetitionCard } from "../src/components/leaderboards/CompetitionCard";

const mockCompetition = {
  id: 1,
  competitionTitle: "Competition A",
  date: new Date("2025-09-15"),
  participants: []
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
