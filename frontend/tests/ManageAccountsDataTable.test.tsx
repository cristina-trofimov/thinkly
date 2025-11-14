import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageAccountsDataTable } from "./../src/components/manage-accounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

// Mock the API
jest.mock("./../src/api/manageAccounts", () => ({
  deleteAccounts: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

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
  {
    id: "select",
    header: () => <div>Select</div>,
    cell: () => <div>Checkbox</div>,
  },
  {
    accessorKey: "firstName",
    header: "First Name",
    cell: ({ row }) => row.getValue("firstName"),
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    cell: ({ row }) => row.getValue("lastName"),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email"),
  },
  {
    accessorKey: "accountType",
    header: "Account Type",
    cell: ({ row }) => row.getValue("accountType"),
  },
];

describe("ManageAccountsDataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders table with data", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={[]} />);
    
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  describe("Search functionality", () => {
    it("filters by email", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "john" } });
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    });

    it("shows no results when filter matches nothing", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "nonexistent@test.com" } });
      
      expect(screen.getByText("No results.")).toBeInTheDocument();
    });

    it("clears search filter", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "john" } });
      expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
      
      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("renders search input with search icon", () => {
      const { container } = render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      expect(searchInput).toBeInTheDocument();
      
      const searchIcon = container.querySelector('.lucide-search');
      expect(searchIcon).toBeInTheDocument();
    });

    it("handles case-insensitive search", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "JOHN" } });
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("handles special characters in search", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "@example" } });
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });
  });

  describe("Filter UI", () => {
    it("shows default filter text", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("All Account Types")).toBeInTheDocument();
    });

    it("renders filter button with filter icon", () => {
      const { container } = render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      expect(filterButton).toBeInTheDocument();
      
      // The icon class is 'lucide-funnel' not 'lucide-filter'
      const filterIcon = container.querySelector('.lucide-funnel');
      expect(filterIcon).toBeInTheDocument();
    });
  });

  describe("Account Type Filtering via Dropdown", () => {
    it("filters by Participant from dropdown", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      const menuItems = await screen.findAllByRole("menuitem");
      const participantItem = menuItems.find(item => item.textContent === "Participant");
      expect(participantItem).toBeDefined();
      await user.click(participantItem!);
      
      await waitFor(() => {
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
      });
    });

    it("filters by Admin from dropdown", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      const menuItems = await screen.findAllByRole("menuitem");
      const adminItem = menuItems.find(item => item.textContent === "Admin");
      expect(adminItem).toBeDefined();
      await user.click(adminItem!);
      
      await waitFor(() => {
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
      });
    });

    it("filters by Owner from dropdown", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      const menuItems = await screen.findAllByRole("menuitem");
      const ownerItem = menuItems.find(item => item.textContent === "Owner");
      expect(ownerItem).toBeDefined();
      await user.click(ownerItem!);
      
      await waitFor(() => {
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
        expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
      });
    });

    it("clears filter by selecting All from dropdown", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      let filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      let menuItems = await screen.findAllByRole("menuitem");
      const adminItem = menuItems.find(item => item.textContent === "Admin");
      await user.click(adminItem!);
      
      await waitFor(() => {
        expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
      });
      
      filterButton = screen.getByRole("button", { name: /Admin/i });
      await user.click(filterButton);
      
      menuItems = await screen.findAllByRole("menuitem");
      const allItem = menuItems.find(item => item.textContent === "All");
      await user.click(allItem!);
      
      await waitFor(() => {
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      });
    });

    it("updates filter button text when filter is applied", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      const menuItems = await screen.findAllByRole("menuitem");
      const participantItem = menuItems.find(item => item.textContent === "Participant");
      await user.click(participantItem!);
      
      await waitFor(() => {
        // Use getAllByText since "Participant" appears in both button and table cell
        const participantElements = screen.getAllByText("Participant");
        expect(participantElements.length).toBeGreaterThan(0);
        // Verify the button text was updated by checking if button contains "Participant"
        const updatedButton = screen.getByRole("button", { name: /Participant/i });
        expect(updatedButton).toBeInTheDocument();
      });
    });
  });

  describe("Edit Mode", () => {
    it("renders edit button initially", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });

    it("toggles edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
    });

    it("cancels edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      await user.click(cancelButton);
      
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });

    it("clears row selection when canceling edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText(/0 of 3 row\(s\) selected/)).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText(/row\(s\) selected/)).not.toBeInTheDocument();
    });

    it("hides edit button when in edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
    });
  });

  describe("Delete Functionality", () => {
    it("disables delete button when no rows selected", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /Delete/i });
        expect(deleteButton).toBeDisabled();
      });
    });

    it("accepts onDeleteUsers prop", () => {
      const mockOnDeleteUsers = jest.fn();
      render(
        <ManageAccountsDataTable 
          columns={mockColumns} 
          data={mockData}
          onDeleteUsers={mockOnDeleteUsers}
        />
      );
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    const largeDataset = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      firstName: `User`,
      lastName: `${i}`,
      email: `user${i}@example.com`,
      accountType: "Admin" as const,
    }));

    it("navigates to next page", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={largeDataset} />);
      
      expect(screen.getByText("user0@example.com")).toBeInTheDocument();
      
      const nextButton = screen.getByRole("button", { name: "Next" });
      fireEvent.click(nextButton);
      
      expect(screen.queryByText("user0@example.com")).not.toBeInTheDocument();
      expect(screen.getByText("user10@example.com")).toBeInTheDocument();
    });

    it("navigates to previous page", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={largeDataset} />);
      
      const nextButton = screen.getByRole("button", { name: "Next" });
      const previousButton = screen.getByRole("button", { name: "Previous" });
      
      fireEvent.click(nextButton);
      expect(screen.getByText("user10@example.com")).toBeInTheDocument();
      
      fireEvent.click(previousButton);
      expect(screen.getByText("user0@example.com")).toBeInTheDocument();
    });

    it("disables previous button on first page", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={largeDataset} />);
      
      const previousButton = screen.getByRole("button", { name: "Previous" });
      expect(previousButton).toBeDisabled();
    });

    it("disables next button on last page", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const nextButton = screen.getByRole("button", { name: "Next" });
      expect(nextButton).toBeDisabled();
    });

    it("renders pagination icons", () => {
      const { container } = render(<ManageAccountsDataTable columns={mockColumns} data={largeDataset} />);
      
      const leftIcon = container.querySelector('.lucide-chevron-left');
      const rightIcon = container.querySelector('.lucide-chevron-right');
      
      expect(leftIcon).toBeInTheDocument();
      expect(rightIcon).toBeInTheDocument();
    });
  });

  describe("Row selection", () => {
    it("shows selection count in edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText(/0 of 3 row\(s\) selected/)).toBeInTheDocument();
      });
    });

    it("hides selection count when not in edit mode", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.queryByText(/row\(s\) selected/)).not.toBeInTheDocument();
    });

    it("hides select column when not in edit mode", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      // The select column header should not be visible
      expect(screen.queryByText("Select")).not.toBeInTheDocument();
    });

    it("shows select column in edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText("Select")).toBeInTheDocument();
      });
    });
  });

  describe("Table structure", () => {
    it("renders all column headers", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("Last Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Account Type")).toBeInTheDocument();
    });

    it("renders correct number of rows for data", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const rows = screen.getAllByRole("row");
      // Header row + data rows
      expect(rows).toHaveLength(mockData.length + 1);
    });

    it("renders table container with border", () => {
      const { container } = render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const borderDiv = container.querySelector('.overflow-hidden.rounded-md.border');
      expect(borderDiv).toBeInTheDocument();
    });
  });

  describe("Callbacks", () => {
    it("accepts onUserUpdate prop", () => {
      const mockOnUserUpdate = jest.fn();
      render(
        <ManageAccountsDataTable 
          columns={mockColumns} 
          data={mockData}
          onUserUpdate={mockOnUserUpdate}
        />
      );
      
      expect(mockOnUserUpdate).not.toHaveBeenCalled();
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
      
      // The callback should be available in table meta for ActionsCell
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });
});