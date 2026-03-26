import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlgoTimePage from "../src/views/AlgoTimePage";
import { getAllAlgotimeSessions } from "@/api/AlgotimeAPI";
import { logFrontend } from "@/api/LoggerAPI";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/api/AlgotimeAPI", () => ({
  getAllAlgotimeSessions: jest.fn(),
}));

jest.mock("@/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date();

const makeSession = (overrides = {}) => ({
  id: "session-1",
  eventName: "Test Event",
  seriesName: "Test Series",
  startTime: new Date(now.getTime() - 30 * 60_000), // 30 min ago → Active
  endTime: new Date(now.getTime() + 60 * 60_000),   // 1 hr from now
  ...overrides,
});

const activeSession = makeSession();

const upcomingSession = makeSession({
  id: "session-2",
  eventName: "Upcoming Event",
  seriesName: "Future Series",
  startTime: new Date(now.getTime() + 2 * 60 * 60_000), // 2 hrs from now
  endTime: new Date(now.getTime() + 3 * 60 * 60_000),
});

const completedSession = makeSession({
  id: "session-3",
  eventName: "Past Event",
  seriesName: "Old Series",
  startTime: new Date(now.getTime() - 3 * 60 * 60_000), // 3 hrs ago
  endTime: new Date(now.getTime() - 1 * 60 * 60_000),   // 1 hr ago
});

const mockedGetAllAlgotimeSessions = getAllAlgotimeSessions as jest.MockedFunction<
  typeof getAllAlgotimeSessions
>;
const mockedLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AlgoTimePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  describe("loading state", () => {
    it("shows a loading indicator while fetching sessions", async () => {
      let resolve: (v: unknown[]) => void;
      mockedGetAllAlgotimeSessions.mockReturnValue(
        new Promise((r) => { resolve = r; }) as any
      );

      render(<AlgoTimePage />);

      expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();

      resolve!([]);
      await waitFor(() =>
        expect(screen.queryByText(/loading sessions/i)).not.toBeInTheDocument()
      );
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("renders the empty-state message when the API returns no sessions", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([]);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByText(/no algotime sessions/i)).toBeInTheDocument()
      );

      expect(
        screen.getByText(/create a session from the admin dashboard/i)
      ).toBeInTheDocument();
    });
  });

  // ── Session cards ────────────────────────────────────────────────────────────

  describe("session cards", () => {
    it("renders a card for each session returned by the API", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([
        activeSession,
        upcomingSession,
        completedSession,
      ] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByText("Test Event")).toBeInTheDocument()
      );

      expect(screen.getByText("Upcoming Event")).toBeInTheDocument();
      expect(screen.getByText("Past Event")).toBeInTheDocument();
    });

    it("shows the series name when present", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([activeSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByText("Test Series")).toBeInTheDocument()
      );
    });

    it("does not show a series name element when seriesName is falsy", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([
        makeSession({ seriesName: undefined }),
      ] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByText("Test Event")).toBeInTheDocument()
      );

      expect(screen.queryByText("Test Series")).not.toBeInTheDocument();
    });
  });

  // ── Status badges ────────────────────────────────────────────────────────────

  describe("status badges", () => {
    it("displays 'Active' badge for a currently running session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([activeSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    });

    it("displays 'Upcoming' badge for a future session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([upcomingSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() => expect(screen.getByText("Upcoming")).toBeInTheDocument());
    });

    it("displays 'Completed' badge for a past session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([completedSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() => expect(screen.getByText("Completed")).toBeInTheDocument());
    });

    it("treats a session with an invalid startTime date as Upcoming", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([
        makeSession({ startTime: "not-a-date", endTime: "not-a-date" }),
      ] as any);

      render(<AlgoTimePage />);

      await waitFor(() => expect(screen.getByText("Upcoming")).toBeInTheDocument());
    });
  });

  // ── Action buttons ───────────────────────────────────────────────────────────

  describe("action buttons", () => {
    it("shows 'Join Now' for an active session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([activeSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /join now/i })).toBeInTheDocument()
      );
    });

    it("shows 'View Details' for an upcoming session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([upcomingSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument()
      );
    });

    it("shows 'Access Session' for a completed session", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([completedSession] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /access session/i })).toBeInTheDocument()
      );
    });

    it("logs the session id to the console when a button is clicked", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      mockedGetAllAlgotimeSessions.mockResolvedValue([activeSession] as any);

      render(<AlgoTimePage />);

      const btn = await screen.findByRole("button", { name: /join now/i });
      await userEvent.click(btn);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Accessing session ${activeSession.id}`
      );

      consoleSpy.mockRestore();
    });
  });

  // ── Sort order ───────────────────────────────────────────────────────────────

  describe("sort order", () => {
    it("renders Active sessions before Upcoming, and Upcoming before Completed", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([
        completedSession,
        upcomingSession,
        activeSession,
      ] as any);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.getByText("Test Event")).toBeInTheDocument()
      );

      const cards = screen.getAllByRole("article"); // <Card> renders as <article>
      const texts = cards.map((c) => c.textContent ?? "");

      const activeIdx = texts.findIndex((t) => t.includes("Test Event"));
      const upcomingIdx = texts.findIndex((t) => t.includes("Upcoming Event"));
      const completedIdx = texts.findIndex((t) => t.includes("Past Event"));

      expect(activeIdx).toBeLessThan(upcomingIdx);
      expect(upcomingIdx).toBeLessThan(completedIdx);
    });
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  describe("error handling", () => {
    it("calls logFrontend when the API rejects", async () => {
      const error = new Error("Network failure");
      mockedGetAllAlgotimeSessions.mockRejectedValue(error);

      render(<AlgoTimePage />);

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

    it("includes the error stack in the log call", async () => {
      const error = new Error("Stack test");
      mockedGetAllAlgotimeSessions.mockRejectedValue(error);

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(mockedLogFrontend).toHaveBeenCalledWith(
          expect.objectContaining({ stack: error.stack })
        )
      );
    });

    it("handles non-Error rejection values gracefully", async () => {
      mockedGetAllAlgotimeSessions.mockRejectedValue("plain string error");

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(mockedLogFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "ERROR",
            message: expect.stringContaining("plain string error"),
          })
        )
      );
    });

    it("stops showing the loading state after an error", async () => {
      mockedGetAllAlgotimeSessions.mockRejectedValue(new Error("oops"));

      render(<AlgoTimePage />);

      await waitFor(() =>
        expect(screen.queryByText(/loading sessions/i)).not.toBeInTheDocument()
      );
    });
  });

  // ── Date formatting ──────────────────────────────────────────────────────────

  describe("date formatting", () => {
    it("shows 'TBD' when endTime is an invalid date", async () => {
      mockedGetAllAlgotimeSessions.mockResolvedValue([
        makeSession({ endTime: "invalid" }),
      ] as any);

      render(<AlgoTimePage />);

      await waitFor(() => expect(screen.getByText(/TBD/)).toBeInTheDocument());
    });
  });
});
