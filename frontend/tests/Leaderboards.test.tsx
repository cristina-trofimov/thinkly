import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboards } from "../src/components/leaderboards/Leaderboards";
import {
  getCompetitionsDetails,
  getCurrentCompetitionLeaderboard,
} from "../src/api/LeaderboardsAPI";
import { UserContext } from '../src/context/UserContext';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: 'http://localhost:8000',
}));

// getAlgoTimeEntries is no longer used by Leaderboards — AlgoTimeCard owns it.
jest.mock("@/api/LeaderboardsAPI", () => ({
  __esModule: true,
  getCompetitionsDetails: jest.fn(),
  getCurrentCompetitionLeaderboard: jest.fn(),
}));

jest.mock("@/api/AuthAPI", () => ({
  __esModule: true,
  getProfile: jest.fn().mockResolvedValue({ id: 1 }),
}));

// AlgoTimeCard is self-contained; mock it to avoid hitting its own API calls.
jest.mock("../src/components/leaderboards/AlgoTimeCard", () => ({
  AlgoTimeCard: ({ currentUserId }: { currentUserId?: number }) => (
    <div data-testid="algo-time-card">
      AlgoTimeCard{currentUserId !== undefined ? ` uid:${currentUserId}` : ""}
    </div>
  ),
}));

jest.mock("../src/components/leaderboards/CompetitionCard", () => ({
  CompetitionCard: ({ competition }: { competition: any }) => (
    <div data-testid="competition-card">{competition.competitionTitle}</div>
  ),
}));

jest.mock("../src/components/leaderboards/SearchAndFilterBar", () => ({
  SearchAndFilterBar: ({
    search,
    setSearch,
    sortAsc,
    setSortAsc,
  }: {
    search: string;
    setSearch: (v: string) => void;
    sortAsc: boolean;
    setSortAsc: (v: boolean) => void;
  }) => (
    <div data-testid="search-filter-bar">
      <input
        placeholder="Search competitions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button onClick={() => setSortAsc(!sortAsc)}>
        Sort {sortAsc ? "desc" : "asc"}
      </button>
    </div>
  ),
}));

jest.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackLeaderboardViewed: jest.fn(),
    trackLeaderboardTabSwitched: jest.fn(),
    trackLeaderboardSearched: jest.fn(),
    trackLeaderboardSortChanged: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPage = (competitions: any[]) => ({
  total: competitions.length,
  page: 1,
  pageSize: 20,
  competitions,
});

const makeComp = (id: number, title: string, date: Date) => ({
  id,
  competitionTitle: title,
  date,
  participants: [],
  showSeparator: false,
});

const noActiveCompetition = {
  competitionName: "No Active Competition",
  participants: [],
  showSeparator: false,
};

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------

const mockedGetCompetitionsDetails = getCompetitionsDetails as jest.Mock;
const mockedGetCurrentCompetitionLeaderboard = getCurrentCompetitionLeaderboard as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCurrentCompetitionLeaderboard.mockResolvedValue(noActiveCompetition);
  mockedGetCompetitionsDetails.mockResolvedValue(mockPage([]));
});

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  accountType: 'Participant' as const,
}

const renderLeaderboards = () =>
  render(
    <UserContext.Provider value={{ user: mockUser, loading: false, setUser: jest.fn(), refreshUser: jest.fn() }}>
      <Leaderboards />
    </UserContext.Provider>
  )

// ---------------------------------------------------------------------------
// Tab rendering
// ---------------------------------------------------------------------------

describe("Tab rendering", () => {
  it("renders the AlgoTime tab by default (no API call for competitions)", () => {
    renderLeaderboards();
    expect(screen.getByTestId("algo-time-card")).toBeInTheDocument();
  });

  it("renders AlgoTimeCard which is self-contained", () => {
    renderLeaderboards();
    expect(screen.getByTestId("algo-time-card")).toBeInTheDocument();
    expect(mockedGetCompetitionsDetails).not.toHaveBeenCalled();
  });

  it("renders competition cards after switching to the Competitions tab", async () => {
    const comps = [
      makeComp(1, "October Challenge", new Date("2025-10-31")),
      makeComp(2, "September Challenge", new Date("2025-09-15")),
    ];
    mockedGetCompetitionsDetails.mockResolvedValue(mockPage(comps));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() => {
      expect(screen.getByText("October Challenge")).toBeInTheDocument();
      expect(screen.getByText("September Challenge")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("Loading state", () => {
  it("displays loading indicator on the Competitions tab while fetching", async () => {
    mockedGetCompetitionsDetails.mockReturnValue(new Promise(() => { }));
    mockedGetCurrentCompetitionLeaderboard.mockReturnValue(new Promise(() => { }));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    // Component renders skeleton divs while loading, not a text string
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it("hides the loading indicator once data arrives", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue(mockPage([]));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() => {
      expect(screen.queryByText(/loading leaderboards/i)).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("Empty state", () => {
  it("shows 'No competitions found' when the API returns an empty list", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue(mockPage([]));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() =>
      expect(screen.getByText(/No competitions found/i)).toBeInTheDocument()
    );
  });

  it("shows 'No competitions match your search' when search yields no results", async () => {
    // Initial load returns a result; every call after (one per typed character) returns empty.
    mockedGetCompetitionsDetails
      .mockResolvedValueOnce(mockPage([makeComp(1, "October Challenge", new Date("2025-10-31"))]))
      .mockResolvedValue(mockPage([]));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() => expect(screen.getByText("October Challenge")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search competitions..."), "Nonexistent XYZ");

    await waitFor(() =>
      expect(screen.getByText(/No competitions match your search/i)).toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// Search — delegates to the backend
// ---------------------------------------------------------------------------

describe("Search", () => {


  it("resets page to 1 when the search query changes", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue(mockPage([]));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));
    await waitFor(() => expect(mockedGetCompetitionsDetails).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Search competitions..."), "Spring");

    await waitFor(() =>
      expect(mockedGetCompetitionsDetails).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      )
    );
  });

  it("renders what the API returns in response to a search", async () => {
    const filtered = [makeComp(2, "September Challenge", new Date("2025-09-15"))];
    const both = [makeComp(1, "October Challenge", new Date("2025-10-31")), ...filtered];

    // Initial load returns both; every subsequent call (one per typed character)
    // returns only the filtered result.
    mockedGetCompetitionsDetails
      .mockResolvedValueOnce(mockPage(both))
      .mockResolvedValue(mockPage(filtered));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));
    await waitFor(() => expect(screen.getByText("October Challenge")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search competitions..."), "September");

    await waitFor(() => {
      expect(screen.queryByText("October Challenge")).not.toBeInTheDocument();
      expect(screen.getByText("September Challenge")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Sorting — delegates to the backend
// ---------------------------------------------------------------------------

describe("Sorting", () => {
  it("calls getCompetitionsDetails with the search param when the user types", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue(mockPage([]));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));
    await waitFor(() => expect(mockedGetCompetitionsDetails).toHaveBeenCalled());

    const input = screen.getByPlaceholderText("Search competitions...");
    fireEvent.change(input, { target: { value: "Sep" } });

    await waitFor(() =>
      expect(mockedGetCompetitionsDetails).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Sep" })
      )
    );
  });

  it("renders competitions in the order returned by the API", async () => {
    // Backend returns oldest first when sort=asc
    const oldest = makeComp(1, "September Challenge", new Date("2025-09-15"));
    const newest = makeComp(2, "October Challenge", new Date("2025-10-31"));
    mockedGetCompetitionsDetails
      .mockResolvedValueOnce(mockPage([newest, oldest]))  // default desc
      .mockResolvedValueOnce(mockPage([oldest, newest])); // after toggling to asc

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));
    await waitFor(() => expect(screen.getByText("October Challenge")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /sort/i }));

    await waitFor(() => {
      const cards = screen.getAllByTestId("competition-card");
      expect(cards[0]).toHaveTextContent("September Challenge");
      expect(cards[1]).toHaveTextContent("October Challenge");
    });
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("Pagination", () => {
  it("shows pagination controls when there are multiple pages", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue({
      total: 50,
      page: 1,
      pageSize: 20,
      competitions: [makeComp(1, "Comp 1", new Date())],
    });

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() => screen.getByText(/Page 1 of 3/));
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("does not show pagination when there is only one page", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue({
      total: 5,
      page: 1,
      pageSize: 20,
      competitions: [makeComp(1, "Comp 1", new Date())],
    });

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() => expect(screen.getByText("Comp 1")).toBeInTheDocument());
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it("calls getCompetitionsDetails with the next page when Next is clicked", async () => {
    mockedGetCompetitionsDetails.mockResolvedValue({
      total: 50,
      page: 1,
      pageSize: 20,
      competitions: [makeComp(1, "Comp 1", new Date())],
    });

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));
    await waitFor(() => screen.getByText(/Page 1 of 3/));

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mockedGetCompetitionsDetails).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Current competition
// ---------------------------------------------------------------------------

describe("Current competition", () => {
  it("renders the current competition banner when there is an active competition", async () => {
    mockedGetCurrentCompetitionLeaderboard.mockResolvedValue({
      competitionName: "Live Contest",
      participants: [
        { name: "Alice", user_id: 1, total_score: 100, problems_solved: 5, rank: 1, total_time: "01:00:00" },
      ],
      showSeparator: false,
    });

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() =>
      expect(screen.getByText("Current Competition")).toBeInTheDocument()
    );
    expect(screen.getByText("Live Contest")).toBeInTheDocument();
  });

  it("does not render the current competition banner when there is none", async () => {
    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() =>
      expect(screen.queryByText(/loading leaderboards/i)).not.toBeInTheDocument()
    );
    expect(screen.queryByText("Current Competition")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("Error handling", () => {
  it("shows an error message when the competitions API rejects", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    mockedGetCompetitionsDetails.mockRejectedValue(new Error("API Error"));
    mockedGetCurrentCompetitionLeaderboard.mockRejectedValue(new Error("API Error"));

    const user = userEvent.setup();
    renderLeaderboards();
    await user.click(screen.getByRole("tab", { name: /competitions/i }));

    await waitFor(() =>
      expect(screen.getByText("Failed to load competitions")).toBeInTheDocument()
    );

    consoleSpy.mockRestore();
  });
});