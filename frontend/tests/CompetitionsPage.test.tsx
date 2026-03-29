import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CompetitionsPage from "../src/views/CompetitionsPage";
import { getCompetitionsPage } from "@/api/CompetitionAPI";
import { getCompetitionsDetails } from "@/api/LeaderboardsAPI";
import { logFrontend } from "../src/api/LoggerAPI";

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "http://localhost:8000",
}));

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

jest.mock("@/components/leaderboards/ScoreboardDataTable", () => ({
  ScoreboardDataTable: ({ participants }: { participants: unknown[] }) => (
    <div data-testid="scoreboard-table">Scoreboard ({participants.length} entries)</div>
  ),
}));

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

const mockCompetitions = [
  {
    id: 1,
    competitionTitle: "Spring Championship",
    competitionLocation: "New York, NY",
    startDate: tomorrow,
    endDate: tomorrow,
  },
  {
    id: 2,
    competitionTitle: "Winter Open",
    competitionLocation: "Online",
    startDate: yesterday,
    endDate: yesterday,
  },
  {
    id: 3,
    competitionTitle: "Today's Tourney",
    competitionLocation: "",
    startDate: now,
    endDate: new Date(now.getTime() + 60 * 60 * 1000),
  },
];

const makePage = (items = mockCompetitions, total = items.length) => ({
  total,
  page: 1,
  pageSize: 12,
  items,
});

describe("CompetitionsPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockNavigate.mockClear();
  });

  it("shows loading state initially", async () => {
    (getCompetitionsPage as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<CompetitionsPage />);
    await waitFor(() => {
      expect(screen.getByText("Competitions")).toBeInTheDocument();
      expect(screen.getByText(/upcoming and past competitions/i)).toBeInTheDocument();
      expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    });
  });

  it("renders all competitions after loading", async () => {
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
      expect(screen.getByText("Winter Open")).toBeInTheDocument();
      expect(screen.getByText("Today's Tourney")).toBeInTheDocument();
    });
  });

  it("shows status badges", async () => {
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Upcoming").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    });
  });

  it("shows action buttons for each competition state", async () => {
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /view details/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /join now/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /view leaderboard/i })
      ).toBeInTheDocument();
    });
  });

  it("renders location or Online fallback", async () => {
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("New York, NY")).toBeInTheDocument();
      expect(screen.getAllByText("Online")).toHaveLength(2);
    });
  });

  it("shows empty state when no competitions", async () => {
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage([], 0));
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no competitions available/i)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    (getCompetitionsPage as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no competitions available/i)).toBeInTheDocument();
    });
  });

  it("navigates to the competition route when Join Now is clicked", async () => {
    const user = userEvent.setup();
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage([mockCompetitions[2]], 1));
    render(<CompetitionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /join now/i }));
    await user.click(screen.getByRole("button", { name: /join now/i }));

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

  it("opens the details modal when 'View details' is clicked", async () => {
    const user = userEvent.setup();
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage([mockCompetitions[0]], 1));
    render(<CompetitionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /view details/i }));
    await user.click(screen.getByRole("button", { name: /view details/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Spring Championship")).toBeInTheDocument();
  });

  it("opens the leaderboard modal when 'View leaderboard' is clicked", async () => {
    const user = userEvent.setup();
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage([mockCompetitions[1]], 1));
    (getCompetitionsDetails as jest.Mock).mockResolvedValue({ competitions: [] });
    render(<CompetitionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
    await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the ScoreboardDataTable when participants are returned", async () => {
    const user = userEvent.setup();
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage([mockCompetitions[1]], 1));
    (getCompetitionsDetails as jest.Mock).mockResolvedValue({
      competitions: [
        {
          competitionTitle: "Winter Open",
          participants: [{ id: "p1" }, { id: "p2" }],
        },
      ],
    });
    render(<CompetitionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /view leaderboard/i }));
    await user.click(screen.getByRole("button", { name: /view leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByTestId("scoreboard-table")).toBeInTheDocument();
    });
  });

  it("calls getCompetitionsDetails with the competition title as the search term", async () => {
    const user = userEvent.setup();
    (getCompetitionsPage as jest.Mock).mockResolvedValue(makePage([mockCompetitions[1]], 1));
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

  it("calls logFrontend with ERROR level when competition fetch fails", async () => {
    const error = new Error("Network error");
    (getCompetitionsPage as jest.Mock).mockRejectedValue(error);
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
});
