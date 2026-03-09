import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CompetitionsPage from "../src/views/CompetitionsPage";
import { getCompetitions } from "@/api/CompetitionAPI";
import { getCompetitionsDetails } from "@/api/LeaderboardsAPI";
import { logFrontend } from "../src/api/LoggerAPI";

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))

jest.mock("@/api/CompetitionAPI");
jest.mock("../src/api/LoggerAPI", () => ({ logFrontend: jest.fn() }));

jest.mock("@/api/LeaderboardsAPI", () => ({
  getCompetitionsDetails: jest.fn().mockResolvedValue({ competitions: [] }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock child components that are not under test
jest.mock("@/components/leaderboards/ScoreboardDataTable", () => ({
  ScoreboardDataTable: ({ participants }: { participants: unknown[] }) => (
    <div data-testid="scoreboard-table">Scoreboard ({participants.length} entries)</div>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date();

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

const dayAfterTomorrow = new Date(now);
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

const mockCompetitions = [
  {
    id: "1",
    competitionTitle: "Spring Championship",
    competitionLocation: "New York, NY",
    startDate: tomorrow,
  },
  {
    id: "2",
    competitionTitle: "Winter Open",
    competitionLocation: "Online",
    startDate: yesterday,
  },
  {
    id: "3",
    competitionTitle: "Today's Tourney",
    competitionLocation: null,
    startDate: now,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setup = () => userEvent.setup();

// ---------------------------------------------------------------------------
// Original tests (preserved)
// ---------------------------------------------------------------------------

describe("CompetitionsPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockNavigate.mockClear();
  });

  it("shows loading state initially", () => {
    (getCompetitions as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<CompetitionsPage />);
    expect(screen.getByText(/loading competitions/i)).toBeInTheDocument();
  });

  it("renders all competitions after loading", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
      expect(screen.getByText("Winter Open")).toBeInTheDocument();
      expect(screen.getByText("Today's Tourney")).toBeInTheDocument();
    });
  });

  it("shows Upcoming badge for future competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming")).toBeInTheDocument();
    });
  });

  it("shows Completed badge for past competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("shows Active badge for today's competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[2]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("shows 'View details' button for Upcoming competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
    });
  });

  it("shows 'Join Now' button for Active competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[2]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /join now/i })).toBeInTheDocument();
    });
  });

  it("shows 'View leaderboard' button for Completed competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /view leaderboard/i })).toBeInTheDocument();
    });
  });

  it("renders location or Online fallback", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("New York, NY")).toBeInTheDocument();
      expect(screen.getAllByText("Online")).toHaveLength(2);
    });
  });

  it("sorts competitions by status priority then by startDate ascending", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0], mockCompetitions[1]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      const cards = screen.getAllByText(/Winter Open|Spring Championship/);
      expect(cards[0].textContent).toBe("Spring Championship");
      expect(cards[1].textContent).toBe("Winter Open");
    });
  });

  it("shows empty state when no competitions", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no competitions available/i)).toBeInTheDocument();
      expect(screen.getByText(/check back later/i)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    (getCompetitions as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no competitions available/i)).toBeInTheDocument();
    });
  });

  it("falls back to 'Untitled Competition' when title is missing", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([
      { id: "99", competitionTitle: null, competitionLocation: null, startDate: tomorrow },
    ]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Untitled Competition")).toBeInTheDocument();
    });
  });

  it("treats invalid startDate as Upcoming", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([
      { id: "88", competitionTitle: "Bad Date Comp", competitionLocation: null, startDate: new Date("invalid") },
    ]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Filter bar visibility
  // ---------------------------------------------------------------------------

  describe("filter bar", () => {
    it("does not show filter buttons when only one competition is present", async () => {
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /^All$/i })).not.toBeInTheDocument();
      });
    });

    it("shows filter buttons when more than one competition is present", async () => {
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^All$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Active$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Upcoming$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Completed$/i })).toBeInTheDocument();
      });
    });

    it("'All' filter is active by default", async () => {
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => {
        const allBtn = screen.getByRole("button", { name: /^All$/i });
        // shadcn Button with variant="default" renders with bg-primary class
        expect(allBtn).toHaveClass("bg-primary");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Filter interactions
  // ---------------------------------------------------------------------------

  describe("filtering competitions", () => {
    it("filters to only Upcoming competitions when Upcoming is clicked", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^Upcoming$/i }));
      await user.click(screen.getByRole("button", { name: /^Upcoming$/i }));

      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
      expect(screen.queryByText("Winter Open")).not.toBeInTheDocument();
      expect(screen.queryByText("Today's Tourney")).not.toBeInTheDocument();
    });

    it("filters to only Active competitions when Active is clicked", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^Active$/i }));
      await user.click(screen.getByRole("button", { name: /^Active$/i }));

      expect(screen.getByText("Today's Tourney")).toBeInTheDocument();
      expect(screen.queryByText("Spring Championship")).not.toBeInTheDocument();
      expect(screen.queryByText("Winter Open")).not.toBeInTheDocument();
    });

    it("filters to only Completed competitions when Completed is clicked", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^Completed$/i }));
      await user.click(screen.getByRole("button", { name: /^Completed$/i }));

      expect(screen.getByText("Winter Open")).toBeInTheDocument();
      expect(screen.queryByText("Spring Championship")).not.toBeInTheDocument();
      expect(screen.queryByText("Today's Tourney")).not.toBeInTheDocument();
    });

    it("restores all competitions when All is clicked after a filter", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^Upcoming$/i }));
      await user.click(screen.getByRole("button", { name: /^Upcoming$/i }));
      await user.click(screen.getByRole("button", { name: /^All$/i }));

      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
      expect(screen.getByText("Winter Open")).toBeInTheDocument();
      expect(screen.getByText("Today's Tourney")).toBeInTheDocument();
    });

    it("shows 'no active competitions' empty state with filter hint when filter yields nothing", async () => {
      // Only one upcoming competition — no active ones
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0], mockCompetitions[1]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^Active$/i }));
      await user.click(screen.getByRole("button", { name: /^Active$/i }));

      expect(screen.getByText(/no active competitions available/i)).toBeInTheDocument();
      expect(screen.getByText(/try selecting a different filter/i)).toBeInTheDocument();
    });

    it("does not show 'check back later' when a specific filter yields no results", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0], mockCompetitions[1]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^Active$/i }));
      await user.click(screen.getByRole("button", { name: /^Active$/i }));

      expect(screen.queryByText(/check back later/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Sort order within the same status group
  // ---------------------------------------------------------------------------

  describe("sort order within the same status group", () => {
    it("sorts two Upcoming competitions by startDate ascending", async () => {
      const soonComp = { id: "a", competitionTitle: "Soon", competitionLocation: null, startDate: tomorrow };
      const laterComp = { id: "b", competitionTitle: "Later", competitionLocation: null, startDate: dayAfterTomorrow };

      (getCompetitions as jest.Mock).mockResolvedValue([laterComp, soonComp]);
      render(<CompetitionsPage />);

      await waitFor(() => {
        const items = screen.getAllByText(/Soon|Later/);
        expect(items[0].textContent).toBe("Soon");
        expect(items[1].textContent).toBe("Later");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Join Now navigation
  // ---------------------------------------------------------------------------

  describe("Join Now button", () => {
    it("navigates to the competition route when Join Now is clicked", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[2]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /join now/i }));
      await user.click(screen.getByRole("button", { name: /join now/i }));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        `/app/comp/${mockCompetitions[2].competitionTitle}`,
        expect.objectContaining({
          state: expect.objectContaining({
            fromFeed: true,
            comp: mockCompetitions[2],
          }),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Details modal
  // ---------------------------------------------------------------------------

  describe("details modal", () => {
    it("opens the details modal when 'View details' is clicked", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view details/i }));
      await user.click(screen.getByRole("button", { name: /view details/i }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText("Spring Championship")).toBeInTheDocument();
    });

    it("shows competition location inside the details modal", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view details/i }));
      await user.click(screen.getByRole("button", { name: /view details/i }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("New York, NY")).toBeInTheDocument();
    });

    it("shows 'Online' fallback in details modal when location is null", async () => {
      const user = setup();
      const upcomingNoLocation = {
        id: "50",
        competitionTitle: "No Location Comp",
        competitionLocation: null,
        startDate: tomorrow,
      };
      (getCompetitions as jest.Mock).mockResolvedValue([upcomingNoLocation]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view details/i }));
      await user.click(screen.getByRole("button", { name: /view details/i }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Online")).toBeInTheDocument();
    });

    it("shows the Upcoming status badge inside the details modal", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view details/i }));
      await user.click(screen.getByRole("button", { name: /view details/i }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Upcoming")).toBeInTheDocument();
    });

    it("closes the details modal when the close button is activated", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view details/i }));
      await user.click(screen.getByRole("button", { name: /view details/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: /close/i });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Leaderboard modal
  // ---------------------------------------------------------------------------

  describe("leaderboard modal", () => {
    it("opens the leaderboard modal when 'View leaderboard' is clicked", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockResolvedValue({ competitions: [] });
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("shows competition title inside the leaderboard modal", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockResolvedValue({ competitions: [] });
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Winter Open")).toBeInTheDocument();
    });

    it("shows loading state while leaderboard data is being fetched", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      // Never resolves — keeps the loading spinner visible
      (getCompetitionsDetails as jest.Mock).mockReturnValue(new Promise(() => {}));
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      expect(screen.getByText(/loading leaderboard/i)).toBeInTheDocument();
    });

    it("renders the ScoreboardDataTable when participants are returned", async () => {
      const user = setup();
      const mockParticipants = [
        { id: "p1", username: "Alice", score: 100 },
        { id: "p2", username: "Bob", score: 80 },
      ];
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockResolvedValue({
        competitions: [
          {
            competitionTitle: "Winter Open",
            participants: mockParticipants,
          },
        ],
      });
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      await waitFor(() => {
        expect(screen.getByTestId("scoreboard-table")).toBeInTheDocument();
        expect(screen.getByText(/2 entries/i)).toBeInTheDocument();
      });
    });

    it("shows 'no results' message when participant list is empty", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockResolvedValue({ competitions: [] });
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      await waitFor(() => {
        expect(screen.getByText(/no results available for this competition/i)).toBeInTheDocument();
      });
    });

    it("shows an error message when leaderboard fetch fails", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockRejectedValue(new Error("Server error"));
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
      });
    });

    it("calls getCompetitionsDetails with the competition title as the search term", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockResolvedValue({ competitions: [] });
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      await waitFor(() => {
        expect(getCompetitionsDetails).toHaveBeenCalledWith(
          expect.objectContaining({ search: "Winter Open" })
        );
      });
    });

    it("closes the leaderboard modal when the close button is activated", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockResolvedValue({ competitions: [] });
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: /close/i });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("resets leaderboard data when modal is closed and reopened", async () => {
      const user = setup();
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      // First open: returns participants; second open: returns empty
      (getCompetitionsDetails as jest.Mock)
        .mockResolvedValueOnce({
          competitions: [{ competitionTitle: "Winter Open", participants: [{ id: "p1" }] }],
        })
        .mockResolvedValueOnce({ competitions: [] });

      render(<CompetitionsPage />);
      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));

      // First open
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));
      await waitFor(() => expect(screen.getByTestId("scoreboard-table")).toBeInTheDocument());

      // Close
      await user.click(screen.getByRole("button", { name: /close/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      // Second open — should show empty state, not stale data
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));
      await waitFor(() => {
        expect(screen.getByText(/no results available for this competition/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error logging
  // ---------------------------------------------------------------------------

  describe("error logging", () => {
    it("calls logFrontend with ERROR level when competition fetch fails", async () => {
      const error = new Error("Network error");
      (getCompetitions as jest.Mock).mockRejectedValue(error);
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(logFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "ERROR",
            component: "CompetitionsPage",
            stack: error.stack,
          })
        );
      });
    });

    it("calls logFrontend with ERROR level when leaderboard fetch fails", async () => {
      const user = setup();
      const error = new Error("Leaderboard fetch error");
      (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
      (getCompetitionsDetails as jest.Mock).mockRejectedValue(error);
      render(<CompetitionsPage />);

      await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
      await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

      await waitFor(() => {
        expect(logFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "ERROR",
            component: "CompetitionsPage",
            stack: error.stack,
          })
        );
      });
    });

    it("passes the error message in the logFrontend call for competition fetch failure", async () => {
      (getCompetitions as jest.Mock).mockRejectedValue(new Error("Timeout"));
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(logFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Timeout"),
          })
        );
      });
    });

    it("handles non-Error rejections without crashing", async () => {
      (getCompetitions as jest.Mock).mockRejectedValue("string error");
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no competitions available/i)).toBeInTheDocument();
      });
      expect(logFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Unknown error"),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Page structure
  // ---------------------------------------------------------------------------

  describe("page structure", () => {
    it("renders the page heading", async () => {
      (getCompetitions as jest.Mock).mockResolvedValue([]);
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /competitions/i })).toBeInTheDocument();
      });
    });

    it("renders the page subtitle", async () => {
      (getCompetitions as jest.Mock).mockResolvedValue([]);
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(screen.getByText(/upcoming and past competitions/i)).toBeInTheDocument();
      });
    });

    it("hides the loading indicator after data loads", async () => {
      (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
      render(<CompetitionsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading competitions/i)).not.toBeInTheDocument();
      });
    });
  });
});
