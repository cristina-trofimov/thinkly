import { render, screen, waitFor } from "@testing-library/react";

import CompetitionsPage from "../src/views/CompetitionsPage";
import { getCompetitions } from "@/api/CompetitionAPI";

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

// LeaderboardsAPI is imported by the component for the leaderboard modal
jest.mock("@/api/LeaderboardsAPI", () => ({
  getCompetitionsDetails: jest.fn().mockResolvedValue({ competitions: [] }),
}));

// useNavigate is used by the "Join Now" button on Active competitions
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

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

  // Upcoming competitions show a "View details" button (not "Register")
  it("shows 'View details' button for Upcoming competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
    });
  });

  // Active competitions show a "Join Now" button
  it("shows 'Join Now' button for Active competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[2]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /join now/i })).toBeInTheDocument();
    });
  });

  // Completed competitions show a "View leaderboard" button (not a bare "View")
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
      // mockCompetitions[1] has explicit "Online" location,
      // mockCompetitions[2] has null location which falls back to "Online"
      expect(screen.getAllByText("Online")).toHaveLength(2);
    });
  });

  // Sort order is: Active (0) → Upcoming (1) → Completed (2), then by date within each group.
  // "Spring Championship" is Upcoming (1), "Winter Open" is Completed (2),
  // so Spring Championship appears first.
  it("sorts competitions by status priority then by startDate ascending", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0], mockCompetitions[1]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      const cards = screen.getAllByText(/Winter Open|Spring Championship/);
      expect(cards[0].textContent).toBe("Spring Championship"); // Upcoming comes before Completed
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
});
