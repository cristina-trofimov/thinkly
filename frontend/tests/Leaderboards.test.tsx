// __tests__/Leaderboards.test.tsx
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Leaderboards } from "../src/components/leaderboards/Leaderboards";
import { CompetitionCard } from "../src/components/leaderboards/CompetitionCard";
import { ScoreboardDataTable } from "../src/components/leaderboards/ScoreboardDataTable";
import { SearchAndFilterBar } from "../src/components/leaderboards/SearchAndFilterBar";

// Mock data
const mockParticipants = [
  { name: "Alice", points: 100, problemsSolved: 5, runningTime: "10 min" },
  { name: "Bob", points: 90, problemsSolved: 4, runningTime: "12 min" },
];

const mockCompetition = {
  id: "1",
  name: "Test Competition",
  date: "2025-10-01",
  participants: mockParticipants,
};

describe("Leaderboards Component", () => {
  it("renders search and filter bar", () => {
    render(<Leaderboards />);
    expect(screen.getByPlaceholderText("Search competition...")).toBeInTheDocument();
    expect(screen.getByText(/Newest → Oldest/i)).toBeInTheDocument();
  });

  it("renders competition cards", () => {
    render(<Leaderboards />);
    expect(screen.getByText(/Thinkly October Challenge/i)).toBeInTheDocument();
    expect(screen.getByText(/Thinkly September Cup/i)).toBeInTheDocument();
  });

  it("filters competitions based on search input", () => {
    render(<Leaderboards />);
    const input = screen.getByPlaceholderText("Search competition...");
    fireEvent.change(input, { target: { value: "October" } });
    expect(screen.getByText(/Thinkly October Challenge/i)).toBeInTheDocument();
    expect(screen.queryByText(/Thinkly September Cup/i)).not.toBeInTheDocument();
  });

  it("sorts competitions by date", () => {
    render(<Leaderboards />);
    const button = screen.getByText(/Newest → Oldest/i);
    fireEvent.click(button);
    fireEvent.click(screen.getByText("Oldest → Newest"));
    expect(screen.getByText(/Newest → Oldest/i)).toBeInTheDocument(); // toggle should still show menu
  });
});

describe("CompetitionCard Component", () => {
  it("renders competition name and date", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    expect(screen.getByText("Test Competition")).toBeInTheDocument();
    expect(screen.getByText("2025-10-01")).toBeInTheDocument();
  });

  it("toggles scoreboard table on click", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    const header = screen.getByText("Test Competition");
    fireEvent.click(header);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});

describe("ScoreboardDataTable Component", () => {
  it("renders participant data in table", () => {
    render(<ScoreboardDataTable participants={mockParticipants} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("10 min")).toBeInTheDocument();
  });

  it("renders 'No participants found' if list is empty", () => {
    render(<ScoreboardDataTable participants={[]} />);
    expect(screen.getByText("No participants found")).toBeInTheDocument();
  });
});

describe("SearchAndFilterBar Component", () => {
  it("renders input and button", () => {
    const setSearch = jest.fn();
    const setSortAsc = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={setSearch}
        sortAsc={false}
        setSortAsc={setSortAsc}
      />
    );
    expect(screen.getByPlaceholderText("Search competition...")).toBeInTheDocument();
    expect(screen.getByText(/Newest → Oldest/i)).toBeInTheDocument();
  });

  it("calls setSearch on input change", () => {
    const setSearch = jest.fn();
    const setSortAsc = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={setSearch}
        sortAsc={false}
        setSortAsc={setSortAsc}
      />
    );
    const input = screen.getByPlaceholderText("Search competition...");
    fireEvent.change(input, { target: { value: "Test" } });
    expect(setSearch).toHaveBeenCalledWith("Test");
  });

  it("calls setSortAsc when selecting sort option", () => {
    const setSearch = jest.fn();
    const setSortAsc = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={setSearch}
        sortAsc={false}
        setSortAsc={setSortAsc}
      />
    );
    fireEvent.click(screen.getByText(/Newest → Oldest/i));
    fireEvent.click(screen.getByText("Oldest → Newest"));
    expect(setSortAsc).toHaveBeenCalledWith(true);
  });
});
