// tests/ManageRiddles.test.tsx
import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import ManageRiddles from "../src/views/admin/ManageRiddlePage";
import { toast } from "sonner";

import { getRiddles, createRiddle, updateRiddle, deleteRiddle } from "../src/api/RiddlesAPI";

// -------------------- MOCKS --------------------

// 1) Mock API module
jest.mock("../src/api/RiddlesAPI", () => ({
  __esModule: true,
  getRiddles: jest.fn(),
  createRiddle: jest.fn(),
  updateRiddle: jest.fn(),
  deleteRiddle: jest.fn(),
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

// 5) Mock icons
jest.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  Search: () => <span>SearchIcon</span>,
  FileText: () => <span>FileText</span>,
  Image: () => <span>ImageIcon</span>,
  HelpCircle: () => <span>?</span>,
  Pencil: () => <span>Pencil</span>,
  Trash2: () => <span>Trash</span>,
  X: () => <span>X</span>,
}));

// -------------------- TESTS --------------------

describe("ManageRiddles", () => {
  const mockGetRiddles = getRiddles as jest.Mock;
  const mockCreateRiddle = createRiddle as jest.Mock;
  const mockUpdateRiddle = updateRiddle as jest.Mock;
  const mockDeleteRiddle = deleteRiddle as jest.Mock;

  const mockRiddleData = [
    { id: 1, question: "What has keys but no locks?", answer: "A piano", file: null },
    { id: 2, question: "What has legs but cannot walk?", answer: "A chair", file: "http://example.com/image.png" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper: find the dialog-content node that contains some text
  const getDialogContentContaining = (text: string): HTMLElement => {
    const dialogContents = screen.getAllByTestId("dialog-content");
    const found = dialogContents.find((el) => within(el).queryByText(text));
    if (!found) throw new Error(`Dialog content containing "${text}" not found`);
    return found;
  };

  describe("Initial Render", () => {
    it("renders without crashing", async () => {
      mockGetRiddles.mockResolvedValue([]);

      render(<ManageRiddles />);

      expect(screen.getByText("Manage Riddles")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search question or answer...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText("Loading riddles...")).not.toBeInTheDocument();
      });
    });

    it("displays loading state initially", () => {
      mockGetRiddles.mockImplementation(() => new Promise(() => {}));

      render(<ManageRiddles />);

      expect(screen.getByText("Loading riddles...")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("fetches riddles on mount", async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);

      render(<ManageRiddles />);

      await waitFor(() => expect(mockGetRiddles).toHaveBeenCalledTimes(1));
    });

    it("displays fetched riddles", async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);

      render(<ManageRiddles />);

      await waitFor(() => {
        expect(screen.getByText("What has keys but no locks?")).toBeInTheDocument();
        expect(screen.getByText("A piano")).toBeInTheDocument();
        expect(screen.getByText("What has legs but cannot walk?")).toBeInTheDocument();
      });
    });

    it("renders attachment badge/button only when file exists", async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);

      render(<ManageRiddles />);

      await waitFor(() => {
        expect(screen.queryAllByText("Has Media").length).toBe(1);
        expect(screen.queryAllByText("View Attachment").length).toBe(1);
      });
    });
  });

  describe("Search Functionality", () => {
    it("filters riddles based on search query (Answer)", async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);
      render(<ManageRiddles />);

      await waitFor(() => expect(screen.getByText("A piano")).toBeInTheDocument());

      const input = screen.getByPlaceholderText("Search question or answer...");
      fireEvent.change(input, { target: { value: "chair" } });

      expect(screen.getByText("What has legs but cannot walk?")).toBeInTheDocument();
      expect(screen.queryByText("What has keys but no locks?")).not.toBeInTheDocument();
    });

    it("shows empty state behavior when search yields no results", async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);
      render(<ManageRiddles />);

      await waitFor(() => expect(screen.getByText("A piano")).toBeInTheDocument());

      const input = screen.getByPlaceholderText("Search question or answer...");
      fireEvent.change(input, { target: { value: "XYZ_NON_EXISTENT" } });

      expect(screen.queryByText("What has keys but no locks?")).not.toBeInTheDocument();
      expect(screen.queryByText("What has legs but cannot walk?")).not.toBeInTheDocument();
    });
  });

  describe("CRUD actions (create / edit / delete)", () => {
    it("re-fetches riddles after create success (onSuccess callback)", async () => {
      mockGetRiddles.mockResolvedValueOnce([]).mockResolvedValueOnce(mockRiddleData);

      render(<ManageRiddles />);

      await waitFor(() => expect(mockGetRiddles).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByTestId("trigger-form-success"));

      await waitFor(() => expect(mockGetRiddles).toHaveBeenCalledTimes(2));
    });

    it("calls deleteRiddle when delete is confirmed (and re-fetches)", async () => {
      mockGetRiddles.mockResolvedValueOnce(mockRiddleData).mockResolvedValueOnce(mockRiddleData);
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

      await waitFor(() => expect(mockGetRiddles).toHaveBeenCalledTimes(2));
    });

    
  });

  describe("Error Handling", () => {


    it("stops loading state even after error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockGetRiddles.mockRejectedValue(new Error("Network Error"));

      render(<ManageRiddles />);

      await waitFor(() => {
        expect(screen.queryByText("Loading riddles...")).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});
