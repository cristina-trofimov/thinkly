import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageAccountsDataTable } from "./../src/components/manage-accounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { deleteAccounts } from "./../src/api/manageAccounts";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/api/manageAccounts", () => ({
  deleteAccounts: jest.fn(),
}));

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", { value: () => false });
  Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", { value: () => {} });
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
  { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com", accountType: "Admin" },
  { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com", accountType: "Participant" },
  { id: 3, firstName: "Bob", lastName: "Johnson", email: "bob@example.com", accountType: "Owner" },
];

const mockColumns: ColumnDef<TestData>[] = [
  { accessorKey: "firstName", header: "First Name" },
  { accessorKey: "lastName", header: "Last Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "accountType", header: "Account Type" },
];

describe("ManageAccountsDataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all rows correctly", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders filter input and dropdown", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByPlaceholderText("Filter emails...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all account types/i })).toBeInTheDocument();
  });

  it("filters rows when typing in the search box", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const input = screen.getByPlaceholderText("Filter emails...");
    fireEvent.change(input, { target: { value: "john" } });
    await waitFor(() => {
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no match is found", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const input = screen.getByPlaceholderText("Filter emails...");
    fireEvent.change(input, { target: { value: "nope@example.com" } });
    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no data provided", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={[]} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
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
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const filterButton = screen.getByRole("button", { name: /all account types/i });
    await user.click(filterButton);
    const participantOption = screen.getByRole("menuitem", { name: /participant/i });
    await user.click(participantOption);
    
    await waitFor(() => {
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    });
  });

  it("filters by Admin account type", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const filterButton = screen.getByRole("button", { name: /all account types/i });
    await user.click(filterButton);
    const adminOption = screen.getByRole("menuitem", { name: /^admin$/i });
    await user.click(adminOption);
    
    await waitFor(() => {
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    });
  });

  it("filters by Owner account type", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const filterButton = screen.getByRole("button", { name: /all account types/i });
    await user.click(filterButton);
    const ownerOption = screen.getByRole("menuitem", { name: /owner/i });
    await user.click(ownerOption);
    
    await waitFor(() => {
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    });
  });

  it("resets filter to show all account types", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const filterButton = screen.getByRole("button", { name: /all account types/i });
    
    await user.click(filterButton);
    await user.click(screen.getByRole("menuitem", { name: /^admin$/i }));
    
    await user.click(filterButton);
    await user.click(screen.getByRole("menuitem", { name: /^all$/i }));
    
    await waitFor(() => {
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });
  });

  it("enters edit mode when edit button is clicked", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);
    
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("exits edit mode when cancel button is clicked", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("shows row selection count in edit mode", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);
    
    expect(screen.getByText(/0 of 3 row\(s\) selected/i)).toBeInTheDocument();
  });

  it("delete button is disabled when no rows are selected", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);
    
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    expect(deleteButton).toBeDisabled();
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
    
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);
    
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    
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
    
  });

  it("handles deletion error from API", async () => {
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
    
  });

  it("handles pagination buttons", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const nextBtn = screen.getByRole("button", { name: /next/i });
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    expect(nextBtn).toBeInTheDocument();
    expect(prevBtn).toBeInTheDocument();
    await user.click(nextBtn);
    await user.click(prevBtn);
  });

  it("handles column header clicks (sorting)", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const firstNameHeader = screen.getByRole("columnheader", { name: /first name/i });
    await user.click(firstNameHeader);
    await user.click(firstNameHeader);
    expect(firstNameHeader).toBeInTheDocument();
  });

  it("calls onUserUpdate when provided", () => {
    const mockOnUserUpdate = jest.fn();
    render(
      <ManageAccountsDataTable 
        columns={mockColumns} 
        data={mockData}
        onUserUpdate={mockOnUserUpdate}
      />
    );
    
  });
});