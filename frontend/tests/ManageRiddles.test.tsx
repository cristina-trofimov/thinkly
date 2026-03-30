// tests/ManageRiddles.test.tsx.
import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import ManageRiddles from "../src/views/admin/ManageRiddlePage";
import { getRiddlesPage, deleteRiddle } from "../src/api/RiddlesAPI";
jest.mock("@/api/LoggerAPI");

// -------------------- MOCKS --------------------
jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
// 1) Mock API module
jest.mock("../src/api/RiddlesAPI", () => ({
  __esModule: true,
  getRiddlesPage: jest.fn(),
  deleteRiddle: jest.fn(),
}));

jest.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackAdminRiddlesViewed: jest.fn(),
    trackAdminRiddleSearched: jest.fn(),
    trackAdminRiddleCreateOpened: jest.fn(),
    trackAdminRiddleCreateSuccess: jest.fn(),
    trackAdminRiddleEditOpened: jest.fn(),
    trackAdminRiddleEditSuccess: jest.fn(),
    trackAdminRiddleDeleteAttempted: jest.fn(),
    trackAdminRiddleDeleteSuccess: jest.fn(),
    trackAdminRiddleDeleteFailed: jest.fn(),
  }),
}));

// 2) Mock Toast (sonner) — toast callable + .error/.success
jest.mock("sonner", () => {
  const toastFn: any = jest.fn();
  toastFn.error = jest.fn();
  toastFn.success = jest.fn();
  return { toast: toastFn };
});

// 3) Mock Child Component (Create Form)
jest.mock("@/components/forms/FileUpload", () => ({
  __esModule: true,
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="mock-create-form">
      <button data-testid="trigger-form-success" onClick={onSuccess}>
        Simulate Success
      </button>
    </div>
  ),
}));

// 4) Mock UI components (Shadcn/Radix)
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className, onClick }: any) => (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => <div data-open={open}>{children}</div>,
  DialogTrigger: ({ children, onClick }: any) => (
    <div onClick={onClick} data-testid="dialog-trigger">
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Strip asChild to avoid React warning
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock("@/components/ui/pagination", () => ({
  Pagination: ({ children }: any) => <nav>{children}</nav>,
  PaginationContent: ({ children }: any) => <div>{children}</div>,
  PaginationEllipsis: () => <span>...</span>,
  PaginationItem: ({ children }: any) => <div>{children}</div>,
  PaginationLink: ({ children, onClick, isActive, ...props }: any) => (
    <button type="button" onClick={onClick} data-active={isActive ? "true" : "false"} {...props}>
      {children}
    </button>
  ),
  PaginationNext: ({ onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      Next
    </button>
  ),
  PaginationPrevious: ({ onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      Previous
    </button>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: () => <span />,
}));

// 5) Mock icons
jest.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  Search: () => <span>SearchIcon</span>,
  FileText: () => <span>FileText</span>,
  Image: () => <span>ImageIcon</span>,
  HelpCircle: () => <span>?</span>,
  Pencil: () => <span>Pencil</span>,
  Trash2: () => <span>Trash</span>,
  Puzzle: () => <span>Puzzle</span>,
  X: () => <span>X</span>,
}));

// -------------------- TESTS --------------------

describe("ManageRiddles", () => {
  const mockGetRiddlesPage = getRiddlesPage as jest.Mock;
  const mockDeleteRiddle = deleteRiddle as jest.Mock;

  const mockRiddleData = [
    { id: 1, question: "What has keys but no locks?", answer: "A piano", file: null },
    { id: 2, question: "What has legs but cannot walk?", answer: "A chair", file: "http://example.com/image.png" },
  ];

  const paginatedRiddles = (items = mockRiddleData, page = 1, pageSize = 23, total = items.length) => ({
    total,
    page,
    pageSize,
    items,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expectRiddleSkeletonsToRender = () => {
    expect(screen.getAllByText("Create New Riddle").length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  };

  // Helper: find the dialog-content node that contains some text
  const getDialogContentContaining = (text: string): HTMLElement => {
    const dialogContents = screen.getAllByTestId("dialog-content");
    const found = dialogContents.find((el) => within(el).queryByText(text));
    if (!found) throw new Error(`Dialog content containing "${text}" not found`);
    return found;
  };

  describe("Initial Render", () => {
    it("renders without crashing", async () => {
      mockGetRiddlesPage.mockResolvedValue(paginatedRiddles([]));

      render(<ManageRiddles />);

      expect(screen.getByText("Manage Riddles")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search question or answer...")).toBeInTheDocument();

      await waitFor(() => {
        expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
      });
    });

    it("displays loading state initially", () => {
      mockGetRiddlesPage.mockImplementation(() => new Promise(() => {}));

      render(<ManageRiddles />);

      expectRiddleSkeletonsToRender();
    });
  });

  describe("Data Fetching", () => {
    it("fetches riddles on mount", async () => {
      mockGetRiddlesPage.mockResolvedValue(paginatedRiddles());

      render(<ManageRiddles />);

      await waitFor(() => expect(mockGetRiddlesPage).toHaveBeenCalledTimes(1));
    });

    it("displays fetched riddles", async () => {
      mockGetRiddlesPage.mockResolvedValue(paginatedRiddles());

      render(<ManageRiddles />);

      await waitFor(() => {
        expect(screen.getByText("What has keys but no locks?")).toBeInTheDocument();
        expect(screen.getByText("A piano")).toBeInTheDocument();
        expect(screen.getByText("What has legs but cannot walk?")).toBeInTheDocument();
      });
    });

    it("renders attachment badge/button only when file exists", async () => {
      mockGetRiddlesPage.mockResolvedValue(paginatedRiddles());

      render(<ManageRiddles />);

      await waitFor(() => {
        expect(screen.queryAllByText("Has Media").length).toBe(1);
        expect(screen.queryAllByText("View Attachment").length).toBe(1);
      });
    });
  });

  describe("Search Functionality", () => {
    it("filters riddles based on search query (Answer)", async () => {
      mockGetRiddlesPage
        .mockResolvedValueOnce(paginatedRiddles())
        .mockResolvedValueOnce(paginatedRiddles([mockRiddleData[1]], 1, 23, 1));
      render(<ManageRiddles />);

      await waitFor(() => expect(screen.getByText("A piano")).toBeInTheDocument());

      const input = screen.getByPlaceholderText("Search question or answer...");
      fireEvent.change(input, { target: { value: "chair" } });

      await waitFor(() =>
        expect(mockGetRiddlesPage).toHaveBeenLastCalledWith({ page: 1, pageSize: 23, search: "chair" })
      );
    });

    it("shows empty state behavior when search yields no results", async () => {
      mockGetRiddlesPage
        .mockResolvedValueOnce(paginatedRiddles())
        .mockResolvedValueOnce(paginatedRiddles([], 1, 23, 0));
      render(<ManageRiddles />);

      await waitFor(() => expect(screen.getByText("A piano")).toBeInTheDocument());

      const input = screen.getByPlaceholderText("Search question or answer...");
      fireEvent.change(input, { target: { value: "XYZ_NON_EXISTENT" } });

      await waitFor(() => expect(screen.getByText("No results.")).toBeInTheDocument());
    });
  });

  describe("CRUD actions (create / edit / delete)", () => {
    it("re-fetches riddles after create success (onSuccess callback)", async () => {
      mockGetRiddlesPage
        .mockResolvedValueOnce(paginatedRiddles([]))
        .mockResolvedValueOnce(paginatedRiddles());

      render(<ManageRiddles />);

      await waitFor(() => expect(mockGetRiddlesPage).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByTestId("trigger-form-success"));

      await waitFor(() => expect(mockGetRiddlesPage).toHaveBeenCalledTimes(2));
    });

    it("calls deleteRiddle when delete is confirmed (and re-fetches)", async () => {
      mockGetRiddlesPage
        .mockResolvedValueOnce(paginatedRiddles())
        .mockResolvedValueOnce(paginatedRiddles());
      mockDeleteRiddle.mockResolvedValue(undefined);

      render(<ManageRiddles />);

      await waitFor(() => expect(screen.getByText("A piano")).toBeInTheDocument());

      // Click the delete icon button (opens confirmation dialog)
      const deleteBtn = screen.getAllByTitle("Delete")[0];
      fireEvent.click(deleteBtn);

      // Confirm dialog exists
      const deleteDialog = getDialogContentContaining("Delete riddle?");
      const confirmDeleteBtn = within(deleteDialog).getByRole("button", { name: "Delete" });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => expect(mockDeleteRiddle).toHaveBeenCalledTimes(1));
      expect(mockDeleteRiddle).toHaveBeenCalledWith(1);

      await waitFor(() => expect(mockGetRiddlesPage).toHaveBeenCalledTimes(2));
    });

    
  });

  describe("Error Handling", () => {


    it("stops loading state even after error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockGetRiddlesPage.mockRejectedValue(new Error("Network Error"));

      render(<ManageRiddles />);

      await waitFor(() => {
        expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
      });

      consoleSpy.mockRestore();
    });
  });
});
