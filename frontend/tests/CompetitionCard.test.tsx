import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CompetitionCard } from "../src/components/leaderboards/CompetitionCard";
import type { CompetitionWithParticipants } from "../src/types/competition/CompetitionWithParticipants.type";

// ─── External module mocks ────────────────────────────────────────────────────

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: "http://localhost:8000",
}));

jest.mock("@/api/LeaderboardsAPI", () => ({
  getAllCompetitionEntries: jest.fn(),
}));

jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

jest.mock("@/components/leaderboards/ScoreboardDataTable", () => ({
  ScoreboardDataTable: () => <div data-testid="mock-scoreboard">Mock Table</div>,
}));

jest.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down">Down</span>,
  ChevronUp:   () => <span data-testid="chevron-up">Up</span>,
  Copy:        () => <span data-testid="icon-copy">Copy</span>,
  Check:       () => <span data-testid="icon-check">Check</span>,
  Download:    () => <span data-testid="icon-download">Download</span>,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { getAllCompetitionEntries } from "../src/api/LeaderboardsAPI";
import * as XLSX from "xlsx";

const mockGetAllCompetitionEntries = getAllCompetitionEntries as jest.Mock;

const mockParticipants = [
  { name: "Alice", user_id: 1, total_score: 100, problems_solved: 5, rank: 1, total_time: "01:00:00" },
  { name: "Bob",   user_id: 2, total_score: 80,  problems_solved: 4, rank: 2, total_time: "01:10:00" },
];

const mockCompetition = {
  id: 123,
  competitionTitle: "Winter Championship",
  date: new Date("2024-01-01"),
  participants: [
    { id: "p1", name: "Alice", score: 10 },
    { id: "p2", name: "Bob",   score: 20 },
  ],
  showSeparator: false,
} as unknown as CompetitionWithParticipants;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CompetitionCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllCompetitionEntries.mockResolvedValue(mockParticipants);
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders nothing if there are no participants", () => {
    const { container } = render(
      <CompetitionCard competition={{ ...mockCompetition, participants: [] }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the competition title", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    expect(screen.getByText("Winter Championship")).toBeInTheDocument();
  });

  it("renders Copy and Download buttons", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    expect(screen.getByTitle("Copy leaderboard to clipboard")).toBeInTheDocument();
    expect(screen.getByTitle("Download as Excel file")).toBeInTheDocument();
  });

  // ── Collapse / expand ──────────────────────────────────────────────────────

  it("is closed by default and shows the down chevron", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    expect(screen.queryByTestId("mock-scoreboard")).not.toBeInTheDocument();
    expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
  });

  it("opens when isCurrent=true", () => {
    render(<CompetitionCard competition={mockCompetition} isCurrent />);
    expect(screen.getByTestId("mock-scoreboard")).toBeInTheDocument();
    expect(screen.getByTestId("chevron-up")).toBeInTheDocument();
  });

  it("opens the scoreboard when the header is clicked", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    fireEvent.click(screen.getByText("Winter Championship"));
    expect(screen.getByTestId("mock-scoreboard")).toBeInTheDocument();
    expect(screen.getByTestId("chevron-up")).toBeInTheDocument();
  });

  it("closes the scoreboard when clicked a second time", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    const trigger = screen.getByText("Winter Championship");
    fireEvent.click(trigger); // open
    fireEvent.click(trigger); // close
    expect(screen.queryByTestId("mock-scoreboard")).not.toBeInTheDocument();
  });

  it("clicking Copy does not toggle the card open/closed", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    fireEvent.click(screen.getByTitle("Copy leaderboard to clipboard"));
    expect(screen.queryByTestId("mock-scoreboard")).not.toBeInTheDocument();
  });

  it("clicking Download does not toggle the card open/closed", () => {
    render(<CompetitionCard competition={mockCompetition} />);
    fireEvent.click(screen.getByTitle("Download as Excel file"));
    expect(screen.queryByTestId("mock-scoreboard")).not.toBeInTheDocument();
  });

  // ── Copy button ────────────────────────────────────────────────────────────

  it("calls getAllCompetitionEntries with the competition id when Copy is clicked", async () => {
    render(<CompetitionCard competition={mockCompetition} />);
    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy leaderboard to clipboard"));
    });
    expect(mockGetAllCompetitionEntries).toHaveBeenCalledWith(123);
  });

  it("writes tab-separated data to the clipboard", async () => {
    render(<CompetitionCard competition={mockCompetition} />);
    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy leaderboard to clipboard"));
    });
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("Rank\tName\tTotal Points\tProblems Solved\tTotal Time")
      );
    });
    const written = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0] as string;
    expect(written).toContain("Alice");
    expect(written).toContain("Bob");
  });

  it("shows 'Copied!' confirmation after a successful copy", async () => {
    render(<CompetitionCard competition={mockCompetition} />);
    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy leaderboard to clipboard"));
    });
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  // ── Download button ────────────────────────────────────────────────────────

  it("calls getAllCompetitionEntries with the competition id when Download is clicked", async () => {
    render(<CompetitionCard competition={mockCompetition} />);
    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });
    expect(mockGetAllCompetitionEntries).toHaveBeenCalledWith(123);
  });

  it("builds an xlsx workbook and triggers a file download", async () => {
    render(<CompetitionCard competition={mockCompetition} />);
    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });
    await waitFor(() => {
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("winter-championship")
      );
    });
  });

  // ── Loading / disabled state ───────────────────────────────────────────────

  it("disables both buttons while an export is in flight", async () => {
    let resolveExport!: (v: typeof mockParticipants) => void;
    mockGetAllCompetitionEntries.mockReturnValue(
      new Promise((res) => { resolveExport = res; })
    );

    render(<CompetitionCard competition={mockCompetition} />);
    act(() => {
      fireEvent.click(screen.getByTitle("Copy leaderboard to clipboard"));
    });

    await waitFor(() => {
      expect(screen.getByTitle("Copy leaderboard to clipboard")).toBeDisabled();
      expect(screen.getByTitle("Download as Excel file")).toBeDisabled();
    });

    // Resolve so the component finishes cleanly
    await act(async () => { resolveExport(mockParticipants); });
  });
});