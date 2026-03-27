import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import ManageCompetitions from "../src/views/admin/ManageCompetitionsPage";
import { getCompetitionsPage, deleteCompetition } from "../src/api/CompetitionAPI";
import { logFrontend } from "../src/api/LoggerAPI";
import { toast } from "sonner";

const mockNavigate = jest.fn();
const mockLocation = {
  key: "test-key",
  state: null as { success?: boolean } | null,
  pathname: "/manage",
  search: "",
  hash: "",
};

jest.mock("@/context/UserContext", () => ({
  useUser: () => ({
    user: { accountType: "Owner" },
  }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "http://localhost:8000",
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

jest.mock("../src/api/CompetitionAPI");
jest.mock("../src/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../src/components/manageCompetitions/EditCompetitionDialog", () => {
  return function MockEditCompetitionDialog({
    open,
    onOpenChange,
    competitionId,
    onSuccess,
  }: any) {
    if (!open) return null;
    return (
      <div data-testid="edit-competition-dialog">
        <div>Edit Competition {competitionId}</div>
        <button
          onClick={() => {
            onSuccess();
            onOpenChange(false);
          }}
        >
          Save
        </button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    );
  };
});

const mockedGetCompetitionsPage = getCompetitionsPage as jest.MockedFunction<
  typeof getCompetitionsPage
>;
const mockedDeleteCompetition = deleteCompetition as jest.MockedFunction<
  typeof deleteCompetition
>;
const mockedLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);

const competitions = [
  {
    id: 1,
    competitionTitle: "Math Contest",
    competitionLocation: "Toronto",
    startDate: tomorrow,
    endDate: tomorrow,
  },
  {
    id: 2,
    competitionTitle: "Science Fair",
    competitionLocation: "Montreal",
    startDate: new Date(now.getTime() - 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 60 * 60 * 1000),
  },
  {
    id: 3,
    competitionTitle: "History Quiz",
    competitionLocation: "Vancouver",
    startDate: yesterday,
    endDate: yesterday,
  },
];

const makePage = (items = competitions, total = items.length) => ({
  total,
  page: 1,
  pageSize: 27,
  items,
});

describe("ManageCompetitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCompetitionsPage.mockResolvedValue(makePage());
    mockedDeleteCompetition.mockResolvedValue(undefined);
    mockLocation.state = null;
  });

  it("shows the skeleton on initial unresolved load", () => {
    mockedGetCompetitionsPage.mockReturnValue(new Promise(() => { }) as any);
    const { container } = render(<ManageCompetitions />);

    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders the page title and description after loading", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => {
      expect(screen.getByText("Manage Competitions")).toBeInTheDocument();
      expect(
        screen.getByText("View and manage all your competitions")
      ).toBeInTheDocument();
    });
  });

  it("renders competitions after loading", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => {
      expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
      expect(screen.getByText(/Science Fair/i)).toBeInTheDocument();
      expect(screen.getByText(/History Quiz/i)).toBeInTheDocument();
    });

    expect(mockedGetCompetitionsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 27,
      })
    );
  });

  it("renders the create new competition card", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => {
      expect(screen.getByText("Create New Competition")).toBeInTheDocument();
    });
  });

  it("shows correct status badges", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => {
      expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("navigates to create competition page when create card is clicked", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => screen.getByText(/Create New Competition/i));
    fireEvent.click(screen.getByText(/Create New Competition/i));

    expect(mockNavigate).toHaveBeenCalledWith(
      "/app/dashboard/competitions/createCompetition"
    );
  });

  it("opens edit dialog when competition card is clicked", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => screen.getByText(/Math Contest/i));
    fireEvent.click(screen.getByText(/Math Contest/i));

    expect(screen.getByTestId("edit-competition-dialog")).toBeInTheDocument();
  });

  it("filters competitions by search through the paged API", async () => {
    mockedGetCompetitionsPage
      .mockResolvedValueOnce(makePage())
      .mockResolvedValueOnce(makePage([competitions[1]]));

    render(<ManageCompetitions />);
    await waitFor(() => screen.getByText(/Math Contest/i));

    fireEvent.change(screen.getByPlaceholderText(/search competitions/i), {
      target: { value: "Science" },
    });

    await waitFor(() => {
      expect(mockedGetCompetitionsPage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "Science",
          page: 1,
        })
      );
      expect(screen.getByText(/Science Fair/i)).toBeInTheDocument();
    });
  });

  it("shows empty search state when no results are returned", async () => {
    mockedGetCompetitionsPage
      .mockResolvedValueOnce(makePage())
      .mockResolvedValueOnce(makePage([], 0));

    render(<ManageCompetitions />);
    await waitFor(() => screen.getByText(/Math Contest/i));

    fireEvent.change(screen.getByPlaceholderText(/search competitions/i), {
      target: { value: "Nonexistent" },
    });

    await waitFor(() => {
      expect(screen.getByText("No competitions found")).toBeInTheDocument();
    });
  });

  it("opens delete confirmation dialog when delete button is clicked", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => screen.getByText(/Math Contest/i));
    fireEvent.click(screen.getAllByText("Delete")[0]);

    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("deletes competition when confirmed", async () => {
    render(<ManageCompetitions />);

    await waitFor(() => screen.getByText(/Math Contest/i));
    fireEvent.click(screen.getAllByText("Delete")[0]);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockedDeleteCompetition).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith(
        'Competition "Math Contest" deleted successfully'
      );
    });
  });

  it("shows error toast when delete fails", async () => {
    const error = new Error("Delete failed");
    mockedDeleteCompetition.mockRejectedValue(error);

    render(<ManageCompetitions />);
    await waitFor(() => screen.getByText(/Math Contest/i));

    fireEvent.click(screen.getAllByText("Delete")[0]);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to delete competition. Please try again."
      );
      expect(mockedLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Delete failed"),
        })
      );
    });
  });

  it("shows success toast when navigating with success state", async () => {
    mockLocation.state = { success: true };

    render(<ManageCompetitions />);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Competition published successfully!"
      );
    });
  });

  it("logs error when fetching competitions fails", async () => {
    const error = new Error("Network error");
    mockedGetCompetitionsPage.mockRejectedValue(error);

    render(<ManageCompetitions />);

    await waitFor(() => {
      expect(mockedLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Network error"),
          component: "ManageCompetitionsPage.tsx",
        })
      );
    });
  });
});
