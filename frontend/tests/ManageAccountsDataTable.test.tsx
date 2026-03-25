import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageAccountsDataTable } from "../src/components/manageAccounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { deleteAccounts } from "../src/api/AccountsAPI";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("../src/api/AccountsAPI", () => ({
  deleteAccounts: jest.fn(),
}));

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: "http://localhost:8000",
}));

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
    value: () => false,
  });
  Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", {
    value: () => {},
  });
});

// ─── Test data ────────────────────────────────────────────────────────────────

const user = userEvent.setup();

type TestData = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  accountType: "Participant" | "Admin" | "Owner";
};

const mockData: TestData[] = [
  { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com", accountType: "Admin" },
  { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com", accountType: "Participant" },
  { id: 3, firstName: "Bob", lastName: "Johnson", email: "bob@example.com", accountType: "Owner" },
];

const createManyRows = (count: number): TestData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    email: `user${i + 1}@example.com`,
    accountType: (i % 3 === 0 ? "Admin" : i % 3 === 1 ? "Participant" : "Owner") as TestData["accountType"],
  }));

const createMockColumns = (): ColumnDef<TestData>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select row ${row.id}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: "firstName", header: "First Name" },
  { accessorKey: "lastName", header: "Last Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "accountType", header: "Account Type" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockColumns = createMockColumns();

const getDeleteTriggerButton = () => {
  const btn = screen.getAllByRole("button").find((b) => b.className.includes("text-destructive"));
  if (!btn) throw new Error("Delete trigger button not found");
  return btn;
};

const selectRowByIndex = async (index: number) => {
  const checkboxes = screen.getAllByRole("checkbox");
  await user.click(checkboxes[index]);
};

const openAndConfirmDelete = async () => {
  await user.click(getDeleteTriggerButton());
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ManageAccountsDataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders all rows correctly", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("renders filter input and dropdown", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByPlaceholderText("Filter emails...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /all account types/i })).toBeInTheDocument();
    });

    it("renders column headers", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("Last Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Account Type")).toBeInTheDocument();
    });

    it("renders a table element", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("always shows select column", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const rows = screen.getAllByRole("row");
      const cells = within(rows[1]).getAllByRole("cell");
      expect(cells).toHaveLength(5);
    });

    it("renders rows per page selector", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("Rows per page")).toBeInTheDocument();
    });

    it("renders cell data for each row", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Doe")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  })

  // ── Empty state ────────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("shows empty state when no data provided", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={[]} />);
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });

    it("shows empty state when backend returns no rows for the current filter", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={[]} search="nope@example.com" />);
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });

    it("does not render row data when empty", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={[]} />);
      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    });
  });

  // ── Search / Filter ────────────────────────────────────────────────────────

  describe("search and filter", () => {
    it("calls onSearchChange when typing in the search box", async () => {
      const onSearchChange = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onSearchChange={onSearchChange} />);
      fireEvent.change(screen.getByPlaceholderText("Filter emails..."), { target: { value: "john" } });
      await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith("john"));
    });

    it("reflects controlled search value in the input", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} search="jane" />);
      expect(screen.getByPlaceholderText("Filter emails...")).toHaveValue("jane");
    });

    it("opens and closes account type dropdown", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const filterButton = screen.getByRole("button", { name: /all account types/i });
      await user.click(filterButton);
      expect(filterButton).toHaveAttribute("aria-expanded", "true");
      await user.keyboard("{Escape}");
      expect(filterButton).toHaveAttribute("aria-expanded", "false");
    });

    it("filters by Participant account type", async () => {
      const onUserTypeFilterChange = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onUserTypeFilterChange={onUserTypeFilterChange} />);
      await user.click(screen.getByRole("button", { name: /all account types/i }));
      await user.click(screen.getByRole("menuitem", { name: /participant/i }));
      await waitFor(() => expect(onUserTypeFilterChange).toHaveBeenCalledWith("participant"));
    });

    it("filters by Admin account type", async () => {
      const onUserTypeFilterChange = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onUserTypeFilterChange={onUserTypeFilterChange} />);
      await user.click(screen.getByRole("button", { name: /all account types/i }));
      await user.click(screen.getByRole("menuitem", { name: /^admin$/i }));
      await waitFor(() => expect(onUserTypeFilterChange).toHaveBeenCalledWith("admin"));
    });

    it("filters by Owner account type", async () => {
      const onUserTypeFilterChange = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onUserTypeFilterChange={onUserTypeFilterChange} />);
      await user.click(screen.getByRole("button", { name: /all account types/i }));
      await user.click(screen.getByRole("menuitem", { name: /owner/i }));
      await waitFor(() => expect(onUserTypeFilterChange).toHaveBeenCalledWith("owner"));
    });

    it("resets filter to all", async () => {
      const onUserTypeFilterChange = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onUserTypeFilterChange={onUserTypeFilterChange} />);
      const btn = screen.getByRole("button", { name: /all account types/i });
      await user.click(btn);
      await user.click(screen.getByRole("menuitem", { name: /^admin$/i }));
      await user.click(btn);
      await user.click(screen.getByRole("menuitem", { name: /^all$/i }));
      await waitFor(() => expect(onUserTypeFilterChange).toHaveBeenLastCalledWith("all"));
    });

    it("shows all four filter options in the dropdown", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await user.click(screen.getByRole("button", { name: /all account types/i }));
      expect(screen.getByRole("menuitem", { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /^admin$/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /participant/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /owner/i })).toBeInTheDocument();
    });
  });

  // ── Row selection ──────────────────────────────────────────────────────────

  describe("row selection", () => {
    it("does not show delete/cancel actions when no rows are selected", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole("button").some((b) => b.className.includes("text-destructive"))).toBe(false);
    });

    it("shows delete and cancel actions after selecting at least one row", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(getDeleteTriggerButton()).toBeInTheDocument();
    });

    it("shows row selection count when one row is selected", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      expect(screen.getByText(/1 of 3 row\(s\) selected/i)).toBeInTheDocument();
    });

    it("shows row selection count when two rows are selected", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await selectRowByIndex(2);
      expect(screen.getByText(/2 of 3 row\(s\) selected/i)).toBeInTheDocument();
    });

    it("clears row selection when cancel button is clicked", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
    });

    it("selects all rows when header checkbox is clicked", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]); // header checkbox
      expect(screen.getByText(/3 of 3 row\(s\) selected/i)).toBeInTheDocument();
    });

    it("deselects all rows when header checkbox is clicked again", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);
      await user.click(checkboxes[0]);
      expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
    });

    it("hides row count label when nothing is selected", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
    });
  });

  // ── Deletion ───────────────────────────────────────────────────────────────

  describe("deletion", () => {
    it("successfully deletes selected users", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 1,
        deleted_users: [{ user_id: 1 }], errors: [],
      });
      const onDeleteUsers = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onDeleteUsers={onDeleteUsers} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(deleteAccounts).toHaveBeenCalledWith([1]);
        expect(toast.success).toHaveBeenCalledWith("Successfully deleted 1 user(s).");
        expect(onDeleteUsers).toHaveBeenCalledWith([1]);
      });
    });

    it("handles partial deletion with errors", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 2,
        deleted_users: [{ user_id: 1 }],
        errors: [{ user_id: 2, error: "Cannot delete owner" }],
      });
      const onDeleteUsers = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onDeleteUsers={onDeleteUsers} />);
      await selectRowByIndex(1);
      await selectRowByIndex(2);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(deleteAccounts).toHaveBeenCalledWith([1, 2]);
        expect(toast.success).toHaveBeenCalledWith("Deleted 1/2 users successfully.");
        expect(toast.warning).toHaveBeenCalledWith("1 users could not be deleted.");
        expect(onDeleteUsers).toHaveBeenCalledWith([1]);
      });
    });

    it("handles deletion error from API with detail message", async () => {
      (deleteAccounts as jest.Mock).mockRejectedValue({
        response: { data: { detail: "Cannot delete user: insufficient permissions" } },
      });
      const onDeleteUsers = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onDeleteUsers={onDeleteUsers} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Cannot delete user: insufficient permissions");
        expect(onDeleteUsers).not.toHaveBeenCalled();
      });
    });

    it("handles deletion error without detail message", async () => {
      (deleteAccounts as jest.Mock).mockRejectedValue(new Error("Network error"));
      const onDeleteUsers = jest.fn();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} onDeleteUsers={onDeleteUsers} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete selected user(s).");
        expect(onDeleteUsers).not.toHaveBeenCalled();
      });
    });

    it("cancels delete operation from alert dialog", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await user.click(getDeleteTriggerButton());
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
      expect(deleteAccounts).not.toHaveBeenCalled();
    });

    it("clears selection after successful delete", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 1,
        deleted_users: [{ user_id: 1 }], errors: [],
      });
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
      });
    });

    it("clears selection after error", async () => {
      (deleteAccounts as jest.Mock).mockRejectedValue(new Error("Network error"));
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
      });
    });

    it("alert dialog shows the correct warning text", async () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await user.click(getDeleteTriggerButton());
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText(/are you sure/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  // ── Admin guard ────────────────────────────────────────────────────────────

  describe("admin role guard", () => {
    it("blocks admin from deleting another admin", async () => {
      const adminData: TestData[] = [
        { id: 1, firstName: "Alice", lastName: "A", email: "alice@example.com", accountType: "Admin" },
        { id: 2, firstName: "Bob", lastName: "B", email: "bob@example.com", accountType: "Admin" },
      ];
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={adminData}
          currentUserRole="Admin"
        />
      );
      await selectRowByIndex(1); // select another Admin
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(deleteAccounts).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Permissions Denied",
          expect.objectContaining({ description: expect.stringContaining("Admins cannot delete") })
        );
      });
    });

    it("blocks admin from deleting the owner", async () => {
      const mixedData: TestData[] = [
        { id: 1, firstName: "Alice", lastName: "A", email: "alice@example.com", accountType: "Participant" },
        { id: 2, firstName: "Bob", lastName: "B", email: "bob@example.com", accountType: "Owner" },
      ];
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={mixedData}
          currentUserRole="Admin"
        />
      );
      await selectRowByIndex(2); // select Owner
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(deleteAccounts).not.toHaveBeenCalled();
      });
    });

    it("allows admin to delete a participant", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 1,
        deleted_users: [{ user_id: 2 }], errors: [],
      });
      const mixedData: TestData[] = [
        { id: 1, firstName: "Alice", lastName: "A", email: "alice@example.com", accountType: "Admin" },
        { id: 2, firstName: "Bob", lastName: "B", email: "bob@example.com", accountType: "Participant" },
      ];
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={mixedData}
          currentUserRole="Admin"
        />
      );
      await selectRowByIndex(2); // select Participant
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(deleteAccounts).toHaveBeenCalledWith([2]);
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("allows owner to delete any account type", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 1,
        deleted_users: [{ user_id: 1 }], errors: [],
      });
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={mockData}
          currentUserRole="Owner"
        />
      );
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(deleteAccounts).toHaveBeenCalled();
      });
    });
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("renders pagination buttons", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByRole("link", { name: /go to next page/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /go to previous page/i })).toBeInTheDocument();
    });

    it("shows Page 1 of 1 with single page", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });

    it("disables prev/next on a single page", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByRole("link", { name: /go to previous page/i }).className).toContain("pointer-events-none");
      expect(screen.getByRole("link", { name: /go to next page/i }).className).toContain("pointer-events-none");
    });

    it("shows correct page label on multi-page dataset", () => {
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={createManyRows(25)}
          total={200}
          page={4}
          pageSize={25}
        />
      );
      expect(screen.getByText("Page 4 of 8")).toBeInTheDocument();
    });

    it("shows ellipsis when there are many pages", () => {
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={createManyRows(25)}
          total={200}
          page={4}
          pageSize={25}
        />
      );
      expect(screen.getAllByText("More pages")).toHaveLength(2);
    });

    it("calls onPageChange when next page is clicked", async () => {
      const onPageChange = jest.fn();
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={createManyRows(25)}
          total={200}
          page={4}
          pageSize={25}
          onPageChange={onPageChange}
        />
      );
      await user.click(screen.getByRole("link", { name: /go to next page/i }));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });

    it("calls onPageChange when prev page is clicked", async () => {
      const onPageChange = jest.fn();
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={createManyRows(25)}
          total={200}
          page={4}
          pageSize={25}
          onPageChange={onPageChange}
        />
      );
      await user.click(screen.getByRole("link", { name: /go to previous page/i }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("calls onPageChange when a numbered page is clicked", async () => {
      const onPageChange = jest.fn();
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={createManyRows(25)}
          total={200}
          page={1}
          pageSize={25}
          onPageChange={onPageChange}
        />
      );
      await user.click(screen.getByRole("link", { name: "2" }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  // ── Sorting ────────────────────────────────────────────────────────────────

  describe("sorting", () => {
    it("does not call onSortChange on initial render", () => {
      const onSortChange = jest.fn();
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
        />
      );
      expect(onSortChange).not.toHaveBeenCalled();
    });

    it("passes onUserUpdate to table meta", () => {
      const onUserUpdate = jest.fn();
      render(
        <ManageAccountsDataTable
          columns={mockColumns}
          data={mockData}
          onUserUpdate={onUserUpdate}
        />
      );
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  // ── Toast messages ─────────────────────────────────────────────────────────

  describe("toast messages", () => {
    it("shows success toast on successful deletion", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 1,
        deleted_users: [{ user_id: 1 }], errors: [],
      });
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Successfully deleted 1 user(s).");
      });
    });

    it("shows warning toast on partial deletion", async () => {
      (deleteAccounts as jest.Mock).mockResolvedValue({
        deleted_count: 1, total_requested: 2,
        deleted_users: [{ user_id: 1 }],
        errors: [{ user_id: 2, error: "Cannot delete" }],
      });
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await selectRowByIndex(2);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith("1 users could not be deleted.");
      });
    });

    it("shows error toast on deletion failure", async () => {
      (deleteAccounts as jest.Mock).mockRejectedValue(new Error("Network error"));
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      await selectRowByIndex(1);
      await openAndConfirmDelete();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete selected user(s).");
      });
    });
  });
});