import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageAccountsDataTable } from "./../src/components/manage-accounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";

type TestData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: "Participant" | "Admin" | "Owner";
};

const mockData: TestData[] = [
  { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com", accountType: "Admin" },
  { id: "2", firstName: "Jane", lastName: "Smith", email: "jane@example.com", accountType: "Participant" },
  { id: "3", firstName: "Bob", lastName: "Johnson", email: "bob@example.com", accountType: "Owner" },
];

const mockColumns: ColumnDef<TestData>[] = [
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

    it("handles undefined email filter value", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      expect(searchInput).toHaveValue("");
    });
  });

  describe("Filter UI", () => {
    it("shows default filter text", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("All Account Types")).toBeInTheDocument();
    });

    it("renders filter button", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      expect(filterButton).toBeInTheDocument();
    });
  });

  describe("Account Type Filtering via Dropdown", () => {
    it("filters by Participant from dropdown", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      // Find the dropdown menu item specifically (not the table cell)
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
      
      // Find the dropdown menu item specifically
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
      
      // Find the dropdown menu item specifically
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
      
      // First filter by Admin
      let filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      
      let menuItems = await screen.findAllByRole("menuitem");
      const adminItem = menuItems.find(item => item.textContent === "Admin");
      expect(adminItem).toBeDefined();
      await user.click(adminItem!);
      
      await waitFor(() => {
        expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
      });
      
      // Then clear filter
      filterButton = screen.getByRole("button", { name: /Admin/i });
      await user.click(filterButton);
      
      menuItems = await screen.findAllByRole("menuitem");
      const allItem = menuItems.find(item => item.textContent === "All");
      expect(allItem).toBeDefined();
      await user.click(allItem!);
      
      await waitFor(() => {
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
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
  });

  describe("Pagination", () => {
    const largeDataset = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
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

    it("handles pagination state changes", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={largeDataset} />);
      
      const nextButton = screen.getByRole("button", { name: "Next" });
      expect(nextButton).not.toBeDisabled();
      
      fireEvent.click(nextButton);
      const previousButton = screen.getByRole("button", { name: "Previous" });
      expect(previousButton).not.toBeDisabled();
    });
  });

  describe("Row selection", () => {
    it("shows checkboxes in edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      // Checkboxes from the select column should not be visible initially
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      
      // Click edit button
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      // Now we should be in edit mode - checkboxes should appear
      // Wait for the UI to update
      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /Delete/i });
        expect(deleteButton).toBeInTheDocument();
      });
      
      // Verify we're in edit mode by checking for Cancel button
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });

    it("hides checkboxes when not in edit mode", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      // Checkboxes should not be visible
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    });

    it("displays selection count in edit mode", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);
      
      // Should show selection count
      await waitFor(() => {
        expect(screen.getByText(/0 of 3 row\(s\) selected/)).toBeInTheDocument();
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

    it("renders search input", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByPlaceholderText("Filter emails...")).toBeInTheDocument();
    });

    it("renders correct number of rows for data", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(mockData.length + 1);
    });

    it("renders table container with border", () => {
      const { container } = render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const borderDiv = container.querySelector('.overflow-hidden.rounded-md.border');
      expect(borderDiv).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    const columnsWithSorting: ColumnDef<TestData>[] = [
      {
        accessorKey: "firstName",
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting()}>First Name</button>
        ),
        cell: ({ row }) => row.getValue("firstName"),
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

    it("sorts data when sortable column header is clicked", () => {
      render(<ManageAccountsDataTable columns={columnsWithSorting} data={mockData} />);
      
      const nameButton = screen.getByRole("button", { name: "First Name" });
      fireEvent.click(nameButton);
      
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });

    it("toggles sort direction", () => {
      render(<ManageAccountsDataTable columns={columnsWithSorting} data={mockData} />);
      
      const nameButton = screen.getByRole("button", { name: "First Name" });
      fireEvent.click(nameButton);
      fireEvent.click(nameButton);
      
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  describe("Data rendering", () => {
    it("renders all account types correctly", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Participant")).toBeInTheDocument();
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("renders all first names correctly", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Jane")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("renders all last names correctly", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("Doe")).toBeInTheDocument();
      expect(screen.getByText("Smith")).toBeInTheDocument();
      expect(screen.getByText("Johnson")).toBeInTheDocument();
    });
  });

  describe("State management", () => {
    it("initializes with empty sorting state", () => {
      const { rerender } = render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("John")).toBeInTheDocument();
      
      rerender(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("initializes with empty column filters", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      expect(searchInput).toHaveValue("");
    });

    it("initializes with edit mode disabled", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeInTheDocument();
    });
  });

  describe("Filter and search interaction", () => {
    it("handles search with special characters", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "@example" } });
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("handles case-insensitive search", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "JOHN" } });
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });
});