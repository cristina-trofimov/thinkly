import { render, screen, waitFor } from "@testing-library/react";

import AlgoTimePage from "../src/views/AlgoTimePage";
import { getAlgotimeSessionsPage } from "../src/api/AlgotimeAPI";

jest.mock("@/lib/axiosClient", () => ({
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock("../src/api/AlgotimeAPI");

const mockSessions = [
  {
    id: 1,
    eventName: "Session Alpha",
    seriesName: "Series A",
    startTime: new Date("2025-03-01T10:00:00"),
    endTime: new Date("2025-03-01T11:00:00"),
    questionCooldown: 30,
    questionCount: 2,
    questions: [],
  },
  {
    id: 2,
    eventName: "Session Beta",
    seriesName: null,
    startTime: new Date("2025-02-01T09:00:00"),
    endTime: new Date("2025-02-01T10:00:00"),
    questionCooldown: 30,
    questionCount: 0,
    questions: [],
  },
];

const makePage = (items = mockSessions, total = items.length) => ({
  total,
  page: 1,
  pageSize: 12,
  items,
});

describe("AlgoTimePage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows loading state initially", () => {
    (getAlgotimeSessionsPage as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<AlgoTimePage />);
    expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();
  });

  it("renders sessions after loading", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<AlgoTimePage />);

    await waitFor(() => {
      expect(screen.getByText("Session Alpha")).toBeInTheDocument();
      expect(screen.getByText("Session Beta")).toBeInTheDocument();
    });
  });

  it("renders session question count", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<AlgoTimePage />);

    await waitFor(() => {
      expect(screen.getByText("Questions: 2")).toBeInTheDocument();
      expect(screen.getByText("Questions: 0")).toBeInTheDocument();
    });
  });

  it("renders series name when present", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<AlgoTimePage />);

    await waitFor(() => {
      expect(screen.getByText("Series A")).toBeInTheDocument();
    });
  });

  it("renders Details and Join buttons for each session", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage());
    render(<AlgoTimePage />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /details/i })).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /join/i })).toHaveLength(2);
    });
  });

  it("sorts sessions by startTime ascending", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage([mockSessions[1], mockSessions[0]]));
    render(<AlgoTimePage />);

    await waitFor(() => {
      const cards = screen.getAllByText(/Session (Alpha|Beta)/);
      expect(cards[0].textContent).toBe("Session Beta");
      expect(cards[1].textContent).toBe("Session Alpha");
    });
  });

  it("shows empty state when no sessions", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage([], 0));
    render(<AlgoTimePage />);

    await waitFor(() => {
      expect(screen.getByText(/no algotime sessions/i)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    (getAlgotimeSessionsPage as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<AlgoTimePage />);

    await waitFor(() => {
      expect(screen.getByText(/no algotime sessions/i)).toBeInTheDocument();
    });
  });
});
