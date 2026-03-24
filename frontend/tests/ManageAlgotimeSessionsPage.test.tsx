import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

import ManageAlgotimeSessionsPage from "../src/views/admin/ManageAlgotimeSessionsPage";
import {
  getAlgotimeSessionsPage,
  deleteAlgotime,
} from "../src/api/AlgotimeAPI";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";
import { resetAlgoTimeLeaderboard } from "../src/api/LeaderboardsAPI";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

jest.mock("@/api/AlgotimeAPI", () => ({
  getAlgotimeSessionsPage: jest.fn(),
  deleteAlgotime: jest.fn(),
}));

jest.mock("@/components/algotime/EditAlgotimeDialog", () => ({
  EditAlgoTimeSessionDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-dialog">Edit Dialog</div> : null,
}));

jest.mock("@/lib/axiosClient", () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/api/LeaderboardsAPI", () => ({
  resetAlgoTimeLeaderboard: jest.fn(),
}));

const mockSessions = [
  {
    id: 1,
    eventName: "Winter AlgoTime 2025",
    startTime: new Date("2025-12-28T20:00:00"),
    endTime: new Date("2025-12-28T21:00:00"),
    questionCooldown: 30,
    seriesId: 1,
    seriesName: "Winter Series",
    questions: [],
    questionCount: 4,
  },
  {
    id: 2,
    eventName: "Spring AlgoTime 2025",
    startTime: new Date("2025-03-15T18:00:00"),
    endTime: new Date("2025-03-15T19:00:00"),
    questionCooldown: 30,
    seriesId: 2,
    seriesName: "Spring Series",
    questions: [],
    questionCount: 2,
  },
];

const makePage = (items = mockSessions, total = items.length) => ({
  total,
  page: 1,
  pageSize: 27,
  items,
});

describe("ManageAlgotimeSessionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAlgotimeSessionsPage as jest.Mock).mockResolvedValue(makePage());
    (deleteAlgotime as jest.Mock).mockResolvedValue(undefined);
  });

  test("renders page title and description after loading", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Manage Algotime Sessions")).toBeInTheDocument();
      expect(
        screen.getByText("Create and view all algotime sessions.")
      ).toBeInTheDocument();
    });
  });

  test("renders search input", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search algotime session name")
      ).toBeInTheDocument();
    });
  });

  test("renders create new session card", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Create a New Algotime Session!")).toBeInTheDocument();
    });
  });

  test("loads and displays algotime sessions", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(getAlgotimeSessionsPage).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Winter AlgoTime 2025")).toBeInTheDocument();
      expect(screen.getByText("Spring AlgoTime 2025")).toBeInTheDocument();
    });
  });

  test("shows the skeleton on initial unresolved load", () => {
    (getAlgotimeSessionsPage as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );

    const { container } = render(<ManageAlgotimeSessionsPage />);

    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  test("filters sessions based on search query through the paged API", async () => {
    (getAlgotimeSessionsPage as jest.Mock)
      .mockResolvedValueOnce(makePage())
      .mockResolvedValueOnce(makePage([mockSessions[0]]));

    render(<ManageAlgotimeSessionsPage />);
    await waitFor(() => screen.getByText("Winter AlgoTime 2025"));

    fireEvent.change(screen.getByPlaceholderText("Search algotime session name"), {
      target: { value: "winter" },
    });

    await waitFor(() => {
      expect(getAlgotimeSessionsPage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "winter",
          page: 1,
        })
      );
      expect(screen.getByText("Winter AlgoTime 2025")).toBeInTheDocument();
    });
  });

  test("shows error toast when API call fails", async () => {
    const errorMessage = "Network error";
    (getAlgotimeSessionsPage as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load algotime sessions"
      );
      expect(logFrontend).toHaveBeenCalledWith({
        level: "ERROR",
        message: `Failed to load algotime sessions: ${errorMessage}`,
        component: "ManageAlgotimeSessionsPage.tsx",
        url: window.location.href,
      });
    });
  });

  test("navigates to create page when create card is clicked", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() =>
      expect(screen.getByText("Create a New Algotime Session!")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Create a New Algotime Session!"));

    expect(mockNavigate).toHaveBeenCalledWith(
      "/app/dashboard/algoTimeSessions/algoTimeSessionsManagement"
    );
  });

  test("shows no sessions when filtered search returns empty", async () => {
    (getAlgotimeSessionsPage as jest.Mock)
      .mockResolvedValueOnce(makePage())
      .mockResolvedValueOnce(makePage([], 0));

    render(<ManageAlgotimeSessionsPage />);
    await waitFor(() => screen.getByText("Winter AlgoTime 2025"));

    fireEvent.change(screen.getByPlaceholderText("Search algotime session name"), {
      target: { value: "nonexistent session" },
    });

    await waitFor(() => {
      expect(screen.getByText("No sessions found")).toBeInTheDocument();
    });
  });

  test("renders view button for each session", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /view/i })).toHaveLength(2);
    });
  });

  test("opens edit dialog when view button is clicked", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => screen.getAllByRole("button", { name: /view/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /view/i })[0]);

    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
  });

  test("deletes a session when confirmed", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => screen.getByText("Winter AlgoTime 2025"));
    const sessionCard = screen
      .getByText("Winter AlgoTime 2025")
      .closest('[data-slot="card"]') as HTMLElement;
    fireEvent.click(within(sessionCard).getAllByRole("button")[1]);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteAlgotime).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Session deleted successfully");
    });
  });

  test("renders reset leaderboard button", async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Reset Leaderboard")).toBeInTheDocument();
    });
  });

  test("calls resetAlgoTimeLeaderboard and shows success toast on confirm", async () => {
    (resetAlgoTimeLeaderboard as jest.Mock).mockResolvedValue({
      entriesDeleted: 5,
      message: "success",
    });

    render(<ManageAlgotimeSessionsPage />);
    await waitFor(() => screen.getByText("Reset Leaderboard"));

    fireEvent.click(screen.getByText("Reset Leaderboard"));
    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));

    await waitFor(() => {
      expect(resetAlgoTimeLeaderboard).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(
        "Leaderboard reset successfully - 5 entries deleted."
      );
    });
  });
});
