import { render, screen, waitFor } from "@testing-library/react";

import CompetitionsPage from "../src/views/CompetitionsPage";
import { getCompetitions } from "@/api/CompetitionAPI";

jest.mock("@/lib/axiosClient", () => ({
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/api/CompetitionAPI");

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

  it("shows Register button for Upcoming competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
    });
  });

  it("shows View button for Completed competition", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[1]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^view$/i })).toBeInTheDocument();
    });
  });

  it("renders location or Online fallback", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue(mockCompetitions);
    render(<CompetitionsPage />);

    await waitFor(() => {
      expect(screen.getByText("New York, NY")).toBeInTheDocument();
      // null location falls back to "Online"
      expect(screen.getAllByText("Online")).toHaveLength(2);
    });
  });

  it("sorts competitions by startDate ascending", async () => {
    (getCompetitions as jest.Mock).mockResolvedValue([mockCompetitions[0], mockCompetitions[1]]);
    render(<CompetitionsPage />);

    await waitFor(() => {
      const cards = screen.getAllByText(/Winter Open|Spring Championship/);
      expect(cards[0].textContent).toBe("Winter Open"); // earlier
      expect(cards[1].textContent).toBe("Spring Championship"); // later
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
