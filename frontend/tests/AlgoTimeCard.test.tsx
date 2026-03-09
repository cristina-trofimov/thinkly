import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AlgoTimeCard } from "../src/components/leaderboards/AlgoTimeCard";
import * as LeaderboardsAPI from "../src/api/LeaderboardsAPI";
import type { AlgoTimePage, AlgoTimeEntry } from "../src/api/LeaderboardsAPI";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../src/api/LeaderboardsAPI", () => ({
  getAlgoTimeEntries: jest.fn(),
  getAllAlgoTimeEntriesForExport: jest.fn(),
}));

jest.mock("../src/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackLeaderboardCopied: jest.fn(),
    trackLeaderboardDownloaded: jest.fn(),
  }),
}));

jest.mock("../src/components/leaderboards/AlgoTimeDataTable", () => ({
  AlgoTimeDataTable: jest.fn((props: any) => (
    <div data-testid="algo-time-data-table">
      {props.loading
        ? "loading"
        : `${props.participants.length} participants`}
      {props.currentUserId !== undefined && ` | uid:${props.currentUserId}`}
    </div>
  )),
}));

jest.mock("../src/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div data-testid="card-header" className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 data-testid="card-title" className={className}>{children}</h2>,
  CardContent: ({ children, className }: any) => <div data-testid="card-content" className={className}>{children}</div>,
}));

jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({ "!cols": undefined })),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeEntries = (n: number): AlgoTimeEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    entryId: i + 1,
    seriesId: 1,
    name: `User ${i + 1}`,
    user_id: i + 1,
    total_score: 1000 - i * 10,
    problems_solved: 20,
    rank: i + 1,
    total_time: "01:00:00",
  }));

const mockPage = (entries = makeEntries(3)): AlgoTimePage => ({
  total: entries.length,
  page: 1,
  pageSize: 15,
  entries,
});

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const getAlgoTimeEntries = LeaderboardsAPI.getAlgoTimeEntries as jest.Mock;
const getAllAlgoTimeEntriesForExport = LeaderboardsAPI.getAllAlgoTimeEntriesForExport as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  getAlgoTimeEntries.mockResolvedValue(mockPage());
  getAllAlgoTimeEntriesForExport.mockResolvedValue(makeEntries(3));
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------

describe("Initial data loading", () => {
  it("calls getAlgoTimeEntries on mount", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(getAlgoTimeEntries).toHaveBeenCalledTimes(1));
  });

  it("passes currentUserId to getAlgoTimeEntries", async () => {
    render(<AlgoTimeCard currentUserId={42} />);
    await waitFor(() =>
      expect(getAlgoTimeEntries).toHaveBeenCalledWith(
        expect.objectContaining({ currentUserId: 42 })
      )
    );
  });

  it("shows loading state via AlgoTimeDataTable while data is fetching", () => {
    // Never resolves → stays loading
    getAlgoTimeEntries.mockReturnValue(new Promise(() => {}));
    render(<AlgoTimeCard />);
    expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent("loading");
  });

  it("renders participant count once data loads", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() =>
      expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent("3 participants")
    );
  });

  it("shows an error message when the API rejects", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getAlgoTimeEntries.mockRejectedValue(new Error("network failure"));
    render(<AlgoTimeCard />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load AlgoTime leaderboard")).toBeInTheDocument()
    );
  });

  it("forwards currentUserId to AlgoTimeDataTable", async () => {
    render(<AlgoTimeCard currentUserId={7} />);
    await waitFor(() =>
      expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent("uid:7")
    );
  });
});

// ---------------------------------------------------------------------------
// Card chrome
// ---------------------------------------------------------------------------

describe("Card chrome", () => {
  it("renders the card title", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByTestId("card-title")).toBeInTheDocument());
    expect(screen.getByText("AlgoTime Leaderboard")).toBeInTheDocument();
  });

  it("renders both action buttons", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByTitle("Copy entire table to clipboard")).toBeInTheDocument());
    expect(screen.getByTitle("Download as Excel file")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

describe("Copy button", () => {
  const setupClipboard = () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    return writeText;
  };

  it("shows 'Copy' label initially (after data loads)", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByTitle("Copy entire table to clipboard")).toBeInTheDocument());
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("shows 'Fetching...' immediately after click while export is in progress", async () => {
    setupClipboard();
    // Keep the export call pending
    getAllAlgoTimeEntriesForExport.mockReturnValue(new Promise(() => {}));

    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));

    expect(screen.getAllByText("Fetching...").length).toBeGreaterThan(0);
  });

  it("calls getAllAlgoTimeEntriesForExport (not the paginated endpoint) when copying", async () => {
    setupClipboard();
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(getAllAlgoTimeEntriesForExport).toHaveBeenCalledTimes(1);
  });

  it("writes the correct TSV text (header + one row per entry) to the clipboard", async () => {
    const writeText = setupClipboard();
    const entries = makeEntries(2);
    getAllAlgoTimeEntriesForExport.mockResolvedValue(entries);

    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const text: string = writeText.mock.calls[0][0];
    expect(text).toMatch(/Rank\tName\tTotal Points\tProblems Solved\tTotal Time/);
    for (const e of entries) {
      expect(text).toContain(
        `${e.rank}\t${e.name}\t${e.total_score}\t${e.problems_solved}\t${e.total_time}`
      );
    }
  });

  it("shows 'Copied!' after the clipboard write succeeds", async () => {
    setupClipboard();
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("reverts back to 'Copy' after 2 s", async () => {
    setupClipboard();
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("does NOT revert before 2 s have elapsed", async () => {
    setupClipboard();
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    act(() => jest.advanceTimersByTime(1999));
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("disables only the Copy button while copying", async () => {
    setupClipboard();
    getAllAlgoTimeEntriesForExport.mockReturnValue(new Promise(() => {}));

    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));

    expect(screen.getByTitle("Copy entire table to clipboard")).toBeDisabled();
    expect(screen.getByTitle("Download as Excel file")).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Copy button — execCommand fallback
// ---------------------------------------------------------------------------

describe("Copy button — execCommand fallback", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    document.execCommand = jest.fn().mockReturnValue(true);
  });

  it("uses execCommand when the Clipboard API is unavailable", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("shows 'Copied!' after the execCommand fallback succeeds", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Copy")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Download button
// ---------------------------------------------------------------------------

describe("Download button", () => {
  it("renders with 'Download' label after data loads", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByTitle("Download as Excel file")).toBeInTheDocument());
    expect(screen.getByText("Download")).toBeInTheDocument();
  });

  it("calls getAllAlgoTimeEntriesForExport when download is clicked", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });

    expect(getAllAlgoTimeEntriesForExport).toHaveBeenCalledTimes(1);
  });

  it("calls XLSX.utils.json_to_sheet with the correct row shape", async () => {
    const entries = makeEntries(2);
    getAllAlgoTimeEntriesForExport.mockResolvedValue(entries);

    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });

    const rows = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0];
    expect(rows).toHaveLength(entries.length);
    expect(rows[0]).toEqual({
      Rank: entries[0].rank,
      Name: entries[0].name,
      "Total Points": entries[0].total_score,
      "Problems Solved": entries[0].problems_solved,
      "Total Time": entries[0].total_time,
    });
  });

  it("appends a sheet named 'AlgoTime Leaderboard'", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "AlgoTime Leaderboard"
    );
  });

  it("calls XLSX.writeFile with the correct filename", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "algotime-leaderboard.xlsx"
    );
  });

  it("sets column widths on the worksheet", async () => {
    const mockSheet: any = {};
    (XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue(mockSheet);

    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });

    expect(mockSheet["!cols"]).toEqual([
      { wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 17 }, { wch: 14 },
    ]);
  });

  it("shows 'Fetching...' on the download button while the export is in progress", async () => {
    getAllAlgoTimeEntriesForExport.mockReturnValue(new Promise(() => {}));

    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    fireEvent.click(screen.getByTitle("Download as Excel file"));

    expect(screen.getAllByText("Fetching...").length).toBeGreaterThan(0);
  });

  it("reverts the download button to 'Download' after export completes", async () => {
    render(<AlgoTimeCard />);
    await waitFor(() => expect(screen.getByText("Download")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle("Download as Excel file"));
    });

    expect(screen.getByText("Download")).toBeInTheDocument();
  });
});