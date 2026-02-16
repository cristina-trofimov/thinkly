import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlgoTimeCard } from "../src/components/leaderboards/AlgoTimeCard";
import type { Participant } from "../src/types/account/Participant.type";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../src/components/leaderboards/AlgoTimeDataTable", () => ({
  AlgoTimeDataTable: jest.fn(({ participants, currentUserId }) => (
    <div data-testid="algo-time-data-table">
      Mock Table: {participants.length} participants
      {currentUserId && ` | Current User: ${currentUserId}`}
    </div>
  )),
}));

jest.mock("../src/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h2 data-testid="card-title" className={className}>{children}</h2>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
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

const mockParticipants: Participant[] = [
  {
    user_id: 1,
    name: "Alice Smith",
    rank: 1,
    total_score: 1500,
    problems_solved: 25,
    total_time: "10:30:45",
  },
  {
    user_id: 2,
    name: "Bob Johnson",
    rank: 2,
    total_score: 1200,
    problems_solved: 20,
    total_time: "08:15:30",
  },
  {
    user_id: 3,
    name: "Charlie Brown",
    rank: 3,
    total_score: 1000,
    problems_solved: 18,
    total_time: "07:45:20",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Copy button — happy path (Clipboard API available)
// ---------------------------------------------------------------------------

describe("Copy button", () => {
  const setupClipboard = () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    return writeText;
  };

  it("renders with 'Copy' label initially", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(screen.getByTitle("Copy entire table to clipboard")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("shows 'Copied!' immediately after click and reverts after 2 s", async () => {
    setupClipboard();
    render(<AlgoTimeCard participants={mockParticipants} />);
    const btn = screen.getByTitle("Copy entire table to clipboard");

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("passes the correct tab-separated text to clipboard.writeText", async () => {
    const writeText = setupClipboard();
    render(<AlgoTimeCard participants={mockParticipants} />);

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const clipboardText: string = writeText.mock.calls[0][0];

    // Header row
    expect(clipboardText).toMatch(/Rank\tName\tTotal Points\tProblems Solved\tTotal Time/);
    // Each participant appears as a data row
    for (const p of mockParticipants) {
      expect(clipboardText).toContain(
        `${p.rank}\t${p.name}\t${p.total_score}\t${p.problems_solved}\t${p.total_time}`
      );
    }
  });

  it("does NOT revert 'Copied!' before 2 s have elapsed", async () => {
    setupClipboard();
    render(<AlgoTimeCard participants={mockParticipants} />);

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    act(() => {
      jest.advanceTimersByTime(1999);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("can be clicked multiple times and still reverts correctly each time", async () => {
    setupClipboard();
    render(<AlgoTimeCard participants={mockParticipants} />);
    const btn = screen.getByTitle("Copy entire table to clipboard");

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(btn);
      });
      act(() => jest.advanceTimersByTime(2000));
      expect(screen.getByText("Copy")).toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// Copy button — fallback path (Clipboard API unavailable)
// ---------------------------------------------------------------------------

describe("Copy button — execCommand fallback", () => {
  beforeEach(() => {
    // Remove clipboard API to trigger fallback
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    document.execCommand = jest.fn().mockReturnValue(true);
  });

  it("uses execCommand when clipboard API is unavailable", async () => {
    render(<AlgoTimeCard participants={mockParticipants} />);

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("still sets the 'Copied!' state on fallback success", async () => {
    render(<AlgoTimeCard participants={mockParticipants} />);

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
  it("renders with 'Download' label", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(screen.getByTitle("Download as Excel file")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
  });

  it("calls XLSX.utils.json_to_sheet with correct rows on click", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    fireEvent.click(screen.getByTitle("Download as Excel file"));

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1);
    const rows: any[] = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0];

    expect(rows).toHaveLength(mockParticipants.length);
    expect(rows[0]).toEqual({
      Rank: mockParticipants[0].rank,
      Name: mockParticipants[0].name,
      "Total Points": mockParticipants[0].total_score,
      "Problems Solved": mockParticipants[0].problems_solved,
      "Total Time": mockParticipants[0].total_time,
    });
  });

  it("calls XLSX.utils.book_append_sheet with correct sheet name", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    fireEvent.click(screen.getByTitle("Download as Excel file"));

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "AlgoTime Leaderboard"
    );
  });

  it("calls XLSX.writeFile with the correct filename", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    fireEvent.click(screen.getByTitle("Download as Excel file"));

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "algotme-leaderboard.xlsx"
    );
  });

  it("sets column widths on the worksheet", () => {
    const mockSheet: any = {};
    (XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue(mockSheet);

    render(<AlgoTimeCard participants={mockParticipants} />);
    fireEvent.click(screen.getByTitle("Download as Excel file"));

    expect(mockSheet["!cols"]).toEqual([
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 17 },
      { wch: 14 },
    ]);
  });

  it("does not change button state after download (no 'Downloaded!' label)", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    fireEvent.click(screen.getByTitle("Download as Excel file"));

    // Download button stays as-is; no state flip expected
    expect(screen.getByText("Download")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Button accessibility and layout
// ---------------------------------------------------------------------------

describe("Button accessibility", () => {
  it("Copy button has a descriptive title attribute", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(
      screen.getByTitle("Copy entire table to clipboard")
    ).toBeInTheDocument();
  });

  it("Download button has a descriptive title attribute", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(screen.getByTitle("Download as Excel file")).toBeInTheDocument();
  });

  it("both action buttons are rendered", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(screen.getByTitle("Copy entire table to clipboard")).toBeInTheDocument();
    expect(screen.getByTitle("Download as Excel file")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Props forwarding
// ---------------------------------------------------------------------------

describe("Props forwarding", () => {
  it("forwards all participants to AlgoTimeDataTable", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent(
      `Mock Table: ${mockParticipants.length} participants`
    );
  });

  it("forwards currentUserId to AlgoTimeDataTable", () => {
    render(<AlgoTimeCard participants={mockParticipants} currentUserId={2} />);
    expect(screen.getByTestId("algo-time-data-table")).toHaveTextContent(
      "Current User: 2"
    );
  });

  it("does not forward currentUserId when omitted", () => {
    render(<AlgoTimeCard participants={mockParticipants} />);
    expect(screen.getByTestId("algo-time-data-table")).not.toHaveTextContent(
      "Current User:"
    );
  });
});

// ---------------------------------------------------------------------------
// Participant data integrity in copy output
// ---------------------------------------------------------------------------

describe("Copy output includes all participants", () => {
  it("single participant produces one data row", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<AlgoTimeCard participants={[mockParticipants[0]]} />);

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    const text: string = writeText.mock.calls[0][0];
    const lines = text.split("\n");
    // Header + 1 data row
    expect(lines).toHaveLength(2);
  });

  it("100-participant list produces 101 lines (header + 100 rows)", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const big: Participant[] = Array.from({ length: 100 }, (_, i) => ({
      user_id: i + 1,
      name: `User ${i + 1}`,
      rank: i + 1,
      total_score: 1000 - i,
      problems_solved: 10,
      total_time: "01:00:00",
    }));

    render(<AlgoTimeCard participants={big} />);

    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy entire table to clipboard"));
    });

    const lines: string[] = writeText.mock.calls[0][0].split("\n");
    expect(lines).toHaveLength(101);
  });
});