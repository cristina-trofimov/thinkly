import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlgoTimePage from "../src/views/AlgoTimePage";
import { getAllAlgotimeSessions } from "@/api/AlgotimeAPI";
import { logFrontend } from "@/api/LoggerAPI";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockedUsedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...(jest.requireActual("react-router-dom") as any),
  useNavigate: () => mockedUsedNavigate,
}));

jest.mock("@/api/AlgotimeAPI", () => ({
  getAllAlgotimeSessions: jest.fn(),
}));

jest.mock("@/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date();

const makeSession = (overrides = {}) => ({
  id: `session-${Math.random()}`,
  eventName: "Test Event",
  seriesName: "Test Series",
  startTime: new Date(now.getTime() - 30 * 60_000).toISOString(),
  endTime: new Date(now.getTime() + 60 * 60_000).toISOString(),
  location: "Test Location",
  ...overrides,
});

const activeSession = makeSession({ id: "active-1", eventName: "Test Event" });
const upcomingSession = makeSession({
  id: "upcoming-1",
  eventName: "Upcoming Event",
  startTime: new Date(now.getTime() + 2 * 60 * 60_000).toISOString(),
  endTime: new Date(now.getTime() + 3 * 60 * 60_000).toISOString()
});
const completedSession = makeSession({
  id: "completed-1",
  eventName: "Past Event",
  startTime: new Date(now.getTime() - 3 * 60 * 60_000).toISOString(),
  endTime: new Date(now.getTime() - 1 * 60 * 60_000).toISOString()
});

const mockedGetAllAlgotimeSessions = getAllAlgotimeSessions as jest.MockedFunction<typeof getAllAlgotimeSessions>;
const mockedLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AlgoTimePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows a loading indicator while fetching sessions", async () => {
      let resolve: (v: any[]) => void;
      mockedGetAllAlgotimeSessions.mockReturnValue(
        new Promise((r) => { resolve = r; }) as any
      );

      renderWithRouter(<AlgoTimePage />);
      expect(screen.getByRole("heading", { name: /algotime sessions/i })).toBeInTheDocument();
      expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);

      resolve!([]);
      await waitFor(() =>
        expect(document.querySelector("[data-slot='skeleton']")).not.toBeInTheDocument()
      );
    });
  });

  describe("empty state", () => {
    it("renders the empty-state message when the API returns no sessions", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([]);
      renderWithRouter(<AlgoTimePage />);
      await waitFor(() =>
        expect(screen.getByText(/no sessions available/i)).toBeInTheDocument()
      );
    });
  });

  describe("session cards", () => {
    it("renders a card for each session returned by the API", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([activeSession, upcomingSession, completedSession] as any);
      renderWithRouter(<AlgoTimePage />);
      await waitFor(() => expect(screen.getByText("Test Event")).toBeInTheDocument());
      expect(screen.getByText("Upcoming Event")).toBeInTheDocument();
      expect(screen.getByText("Past Event")).toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("displays 'Active' badge for a currently running session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([activeSession] as any);
      renderWithRouter(<AlgoTimePage />);
      await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    });

    it("treats a session with an invalid startTime as Upcoming", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([makeSession({ startTime: "not-a-date" })] as any);
      renderWithRouter(<AlgoTimePage />);
      await waitFor(() => expect(screen.getByText("Upcoming")).toBeInTheDocument());
    });
  });

  describe("action buttons", () => {
    it("opens the details modal when 'View Details' is clicked on an upcoming session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([upcomingSession] as any);
      renderWithRouter(<AlgoTimePage />);

      const btn = await screen.findByRole("button", { name: /view details/i });
      await userEvent.click(btn);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText(upcomingSession.eventName)).toBeInTheDocument();
      });
    });

    it("navigates to session page when 'Access Session' is clicked on completed session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([completedSession] as any);
      renderWithRouter(<AlgoTimePage />);

      const btn = await screen.findByRole("button", { name: /access session/i });
      await userEvent.click(btn);

      expect(mockedUsedNavigate).toHaveBeenCalledWith(`/app/algotime/${completedSession.id}`);
    });
  });

  describe("sort order", () => {
    it("renders Active sessions before Upcoming, and Upcoming before Completed", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([completedSession, upcomingSession, activeSession] as any);
      renderWithRouter(<AlgoTimePage />);

      await waitFor(() => expect(screen.getByText("Test Event")).toBeInTheDocument());

      const cards = document.querySelectorAll("[data-slot='card']");
      const texts = Array.from(cards).map((c) => c.textContent ?? "");

      const activeIdx = texts.findIndex((t) => t.includes("Test Event"));
      const upcomingIdx = texts.findIndex((t) => t.includes("Upcoming Event"));
      const completedIdx = texts.findIndex((t) => t.includes("Past Event"));

      expect(activeIdx).toBeLessThan(upcomingIdx);
      expect(upcomingIdx).toBeLessThan(completedIdx);
    });
  });

  describe("error handling", () => {
    it("calls logFrontend when the API rejects", async () => {
      const error = new Error("Network failure");
      mockedGetAllAlgotimeSessions.mockRejectedValue(error);

      renderWithRouter(<AlgoTimePage />);

      await waitFor(() =>
        expect(mockedLogFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "ERROR",
            message: expect.stringContaining("Network failure"),
            component: "AlgoTimePage",
          })
        )
      );
    });
  });

  describe("date formatting", () => {
    it("shows 'TBD' when startTime is an invalid date", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([makeSession({ startTime: "invalid" })] as any);
      renderWithRouter(<AlgoTimePage />);
      await waitFor(() => expect(screen.getAllByText(/TBD/)[0]).toBeInTheDocument());
    });
  });
});