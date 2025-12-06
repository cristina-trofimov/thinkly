import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboards } from "../src/components/leaderboards/Leaderboards";
import { getCompetitionsDetails } from "@/api/CompetitionAPI";

// 1. Mock API
jest.mock("@/api/CompetitionAPI", () => ({
  __esModule: true,
  getCompetitionsDetails: jest.fn().mockResolvedValue([]),
  getCompetitions: jest.fn(),
}));

// 2. Mock Child Component
jest.mock("../src/components/leaderboards/CompetitionCard", () => ({
  CompetitionCard: ({ competition }: { competition: any }) => (
    <div data-testid="competition-card">
      {competition.competitionTitle}
    </div>
  ),
}));

// 3. Test Data
const mockCompetitionsData = [
  {
    id: 1,
    competitionTitle: "September Challenge",
    date: new Date("2025-09-15"),
    participants: [],
  },
  {
    id: 2,
    competitionTitle: "October Challenge",
    date: new Date("2025-10-31"),
    participants: [],
  },
];

describe("Leaderboards Component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupSuccess = () => {
    (getCompetitionsDetails as jest.Mock).mockResolvedValue(mockCompetitionsData);
  };

  it("displays loading state initially", async () => {
    (getCompetitionsDetails as jest.Mock).mockReturnValue(new Promise(() => { }));
    render(<Leaderboards />);
    expect(screen.getByText(/loading leaderboards/i)).toBeInTheDocument();
  });

  it("renders competitions sorted by newest date by default", async () => {
    setupSuccess();
    render(<Leaderboards />);

    await waitFor(() => {
      expect(screen.getByText("October Challenge")).toBeInTheDocument();
      expect(screen.getByText("September Challenge")).toBeInTheDocument();
    });

    const items = screen.getAllByTestId("competition-card");
    expect(items[0]).toHaveTextContent("October Challenge");
    expect(items[1]).toHaveTextContent("September Challenge");
  });

  it("filters competitions by search input", async () => {
    setupSuccess();
    const user = userEvent.setup();
    render(<Leaderboards />);

    await waitFor(() => {
      expect(screen.getByText("October Challenge")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i);
    await user.clear(input);
    await user.type(input, "September");

    await waitFor(() => {
      expect(screen.getByText("September Challenge")).toBeInTheDocument();
      expect(screen.queryByText("October Challenge")).not.toBeInTheDocument();
    });
  });

  it("sorts by oldest date when sort is toggled", async () => {
    setupSuccess();
    const user = userEvent.setup();
    render(<Leaderboards />);

    // 1. Wait for initial render
    await waitFor(() => {
      expect(screen.getByText("October Challenge")).toBeInTheDocument();
    });

    // 2. Open the Dropdown
    const sortButton = screen.getByRole("button", { name: /date/i });
    await user.click(sortButton);

    // 3. Find the Menu and the specific Option
    const menu = await screen.findByRole("menu");

    // FIX: Use a more specific Regex to match "Oldest -> Newest" specifically
    // The caret (^) ensures it matches the beginning of the string.
    const oldestOption = await within(menu).findByRole("menuitem", {
      name: /^Oldest/i
    });

    await user.click(oldestOption);

    // 4. Verify Order: Oldest (September) First
    await waitFor(() => {
      const items = screen.getAllByTestId("competition-card");
      expect(items[0]).toHaveTextContent("September Challenge");
      expect(items[1]).toHaveTextContent("October Challenge");
    });
  });

  it("displays empty state when search yields no results", async () => {
    setupSuccess();
    const user = userEvent.setup();
    render(<Leaderboards />);

    await waitFor(() => {
      expect(screen.getByText("October Challenge")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i);
    await user.clear(input);
    await user.type(input, "Nonexistent XYZ");

    await waitFor(() => {
      expect(screen.getByText("No competitions found")).toBeInTheDocument();
      expect(screen.queryByText("October Challenge")).not.toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    (getCompetitionsDetails as jest.Mock).mockRejectedValue(new Error("API Error"));

    render(<Leaderboards />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load leaderboards")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});