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
import { deleteAccounts } from "./../src/api/AccountsAPI";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("./../src/api/AccountsAPI", () => ({
  deleteAccounts: jest.fn(),
}));

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
    value: () => false,
  });
  Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", {
    value: () => {},
  });
});

const user = userEvent.setup();

type TestData = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  accountType: "Participant" | "Admin" | "Owner";
};

const mockData: TestData[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    accountType: "Admin",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    accountType: "Participant",
  },
  {
    id: 3,
    firstName: "Bob",
    lastName: "Johnson",
    email: "bob@example.com",
    accountType: "Owner",
  },
];

const createManyRows = (count: number): TestData[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    firstName: `First${index + 1}`,
    lastName: `Last${index + 1}`,
    email: `user${index + 1}@example.com`,
    accountType: index % 3 === 0 ? "Admin" : index % 3 === 1 ? "Participant" : "Owner",
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

describe("ManageAccountsDataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockColumns = createMockColumns();

  const getDeleteTriggerButton = () => {
    const button = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("text-destructive"));

    if (!button) {
      throw new Error("Delete trigger button not found");
    }

    return button;
  };

  it("renders all rows correctly", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("renders filter input and dropdown", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByPlaceholderText("Filter emails...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /all account types/i })
    ).toBeInTheDocument();
  });

  it("filters rows when typing in the search box", async () => {
    const onSearchChange = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onSearchChange={onSearchChange}
      />
    );
    const input = screen.getByPlaceholderText("Filter emails...");
    fireEvent.change(input, { target: { value: "john" } });
    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith("john");
    });
  });

  it("shows empty state when backend returns no rows for the current filter", () => {
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={[]}
        search="nope@example.com"
      />
    );
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("shows empty state when no data provided", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={[]} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("opens and closes account type dropdown", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const filterButton = screen.getByRole("button", {
      name: /all account types/i,
    });
    await user.click(filterButton);
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
  });

  it("filters by Participant account type", async () => {
    const onUserTypeFilterChange = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onUserTypeFilterChange={onUserTypeFilterChange}
      />
    );
    const filterButton = screen.getByRole("button", {
      name: /all account types/i,
    });
    await user.click(filterButton);
    const participantOption = screen.getByRole("menuitem", {
      name: /participant/i,
    });
    await user.click(participantOption);

    await waitFor(() => {
      expect(onUserTypeFilterChange).toHaveBeenCalledWith("participant");
    });
  });

  it("filters by Admin account type", async () => {
    const onUserTypeFilterChange = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onUserTypeFilterChange={onUserTypeFilterChange}
      />
    );
    const filterButton = screen.getByRole("button", {
      name: /all account types/i,
    });
    await user.click(filterButton);
    const adminOption = screen.getByRole("menuitem", { name: /^admin$/i });
    await user.click(adminOption);

    await waitFor(() => {
      expect(onUserTypeFilterChange).toHaveBeenCalledWith("admin");
    });
  });

  it("filters by Owner account type", async () => {
    const onUserTypeFilterChange = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onUserTypeFilterChange={onUserTypeFilterChange}
      />
    );
    const filterButton = screen.getByRole("button", {
      name: /all account types/i,
    });
    await user.click(filterButton);
    const ownerOption = screen.getByRole("menuitem", { name: /owner/i });
    await user.click(ownerOption);

    await waitFor(() => {
      expect(onUserTypeFilterChange).toHaveBeenCalledWith("owner");
    });
  });

  it("resets filter to show all account types", async () => {
    const onUserTypeFilterChange = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onUserTypeFilterChange={onUserTypeFilterChange}
      />
    );
    const filterButton = screen.getByRole("button", {
      name: /all account types/i,
    });

    await user.click(filterButton);
    await user.click(screen.getByRole("menuitem", { name: /^admin$/i }));

    await user.click(filterButton);
    await user.click(screen.getByRole("menuitem", { name: /^all$/i }));

    await waitFor(() => {
      expect(onUserTypeFilterChange).toHaveBeenLastCalledWith("all");
    });
  });

  it("shows delete and cancel actions after selecting at least one row", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(getDeleteTriggerButton()).toBeInTheDocument();
  });

  it("clears row selection when cancel button is clicked", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    expect(screen.getByText(/1 of 3 row\(s\) selected/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
  });

  it("shows row selection count when rows are selected", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    expect(screen.getByText(/1 of 3 row\(s\) selected/i)).toBeInTheDocument();
  });

  it("does not show delete/cancel actions when no rows are selected", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button")
        .some((btn) => btn.className.includes("text-destructive"))
    ).toBe(false);
  });

  it("always shows select column", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1]; // Skip header row
    const cells = within(firstDataRow).getAllByRole("cell");

    expect(cells.length).toBe(5);
  });

  it("successfully deletes selected users", async () => {
    const mockDeleteResponse = {
      deleted_count: 1,
      total_requested: 1,
      deleted_users: [{ user_id: 1 }],
      errors: [],
    };
    (deleteAccounts as jest.Mock).mockResolvedValue(mockDeleteResponse);

    const onDeleteUsers = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onDeleteUsers={onDeleteUsers}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteAccounts).toHaveBeenCalledWith([1]);
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully deleted 1 user(s)."
      );
      expect(onDeleteUsers).toHaveBeenCalledWith([1]);
    });
  });

  it("handles partial deletion with errors", async () => {
    const mockDeleteResponse = {
      deleted_count: 1,
      total_requested: 2,
      deleted_users: [{ user_id: 1 }],
      errors: [{ user_id: 2, error: "Cannot delete owner" }],
    };
    (deleteAccounts as jest.Mock).mockResolvedValue(mockDeleteResponse);

    const onDeleteUsers = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onDeleteUsers={onDeleteUsers}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteAccounts).toHaveBeenCalledWith([1, 2]);
      expect(toast.success).toHaveBeenCalledWith(
        "Deleted 1/2 users successfully."
      );
      expect(toast.warning).toHaveBeenCalledWith(
        "1 users could not be deleted."
      );
      expect(onDeleteUsers).toHaveBeenCalledWith([1]);
    });
  });

  it("handles deletion error from API with detail message", async () => {
    const mockError = {
      response: {
        data: {
          detail: "Cannot delete user: insufficient permissions",
        },
      },
    };
    (deleteAccounts as jest.Mock).mockRejectedValue(mockError);

    const onDeleteUsers = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onDeleteUsers={onDeleteUsers}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot delete user: insufficient permissions"
      );
      expect(onDeleteUsers).not.toHaveBeenCalled();
    });
  });

  it("handles deletion error without detail message", async () => {
    const mockError = new Error("Network error");
    (deleteAccounts as jest.Mock).mockRejectedValue(mockError);

    const onDeleteUsers = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onDeleteUsers={onDeleteUsers}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to delete selected user(s)."
      );
      expect(onDeleteUsers).not.toHaveBeenCalled();
    });
  });

  it("cancels delete operation from alert dialog", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const cancelButton = within(dialog).getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(deleteAccounts).not.toHaveBeenCalled();
  });

  it("clears selection after successful delete", async () => {
    const mockDeleteResponse = {
      deleted_count: 1,
      total_requested: 1,
      deleted_users: [{ user_id: 1 }],
      errors: [],
    };
    (deleteAccounts as jest.Mock).mockResolvedValue(mockDeleteResponse);

    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    expect(screen.getByText(/1 of 3 row\(s\) selected/i)).toBeInTheDocument();

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
    });
  });

  it("clears selection after error", async () => {
    const mockError = new Error("Network error");
    (deleteAccounts as jest.Mock).mockRejectedValue(mockError);

    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/row\(s\) selected/i)).not.toBeInTheDocument();
    });
  });

  it("handles pagination buttons", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const nextBtn = screen.getByRole("link", { name: /go to next page/i });
    const prevBtn = screen.getByRole("link", { name: /go to previous page/i });
    expect(nextBtn).toBeInTheDocument();
    expect(prevBtn).toBeInTheDocument();
  });

  it("shows page label and disables prev/next when there is one page", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to previous page/i }).className
    ).toContain("pointer-events-none");
    expect(
      screen.getByRole("link", { name: /go to next page/i }).className
    ).toContain("pointer-events-none");
  });

  it("updates page label and ellipsis layout across pagination ranges", async () => {
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

    expect(screen.getByText("Page 4 of 8")).toBeInTheDocument();
    expect(screen.getAllByText("More pages")).toHaveLength(2);

    await user.click(screen.getByRole("link", { name: /go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("handles column header clicks (sorting)", async () => {
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
    const mockOnUserUpdate = jest.fn();
    render(
      <ManageAccountsDataTable
        columns={mockColumns}
        data={mockData}
        onUserUpdate={mockOnUserUpdate}
      />
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows success toast on successful deletion", async () => {
    const mockDeleteResponse = {
      deleted_count: 1,
      total_requested: 1,
      deleted_users: [{ user_id: 1 }],
      errors: [],
    };
    (deleteAccounts as jest.Mock).mockResolvedValue(mockDeleteResponse);

    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully deleted 1 user(s)."
      );
    });
  });

  it("shows warning toast on partial deletion", async () => {
    const mockDeleteResponse = {
      deleted_count: 1,
      total_requested: 2,
      deleted_users: [{ user_id: 1 }],
      errors: [{ user_id: 2, error: "Cannot delete" }],
    };
    (deleteAccounts as jest.Mock).mockResolvedValue(mockDeleteResponse);

    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        "1 users could not be deleted."
      );
    });
  });

  it("shows error toast on deletion failure", async () => {
    const mockError = new Error("Network error");
    (deleteAccounts as jest.Mock).mockRejectedValue(mockError);

    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    await user.click(getDeleteTriggerButton());
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to delete selected user(s)."
      );
    });
  });
});
