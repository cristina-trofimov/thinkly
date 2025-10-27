import { render, screen, fireEvent } from "@testing-library/react";
import { ManageAccountsDataTable } from "./../src/manage-accounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";

type TestData = {
  id: string;
  name: string;
  email: string;
  accountType: "Participant" | "Admin" | "Owner";
};

const mockData: TestData[] = [
  { id: "1", name: "John Doe", email: "john@example.com", accountType: "Admin" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", accountType: "Participant" },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", accountType: "Owner" },
];

const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.getValue("name"),
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
      
      const filterButton = screen.getByRole("button", { name: "All Account Types" });
      expect(filterButton).toBeInTheDocument();
    });

    it("filter button has correct attributes", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const filterButton = screen.getByRole("button", { name: "All Account Types" });
      expect(filterButton).toHaveAttribute("aria-haspopup", "menu");
    });
  });

  describe("Edit button", () => {
    it("renders edit button", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    const largeDataset = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      name: `User ${i}`,
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
    const columnsWithSelection: ColumnDef<TestData>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select row ${row.id}`}
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
          />
        ),
      },
      ...mockColumns,
    ];

    it("selects individual row", () => {
      render(<ManageAccountsDataTable columns={columnsWithSelection} data={mockData} />);
      
      const rowCheckbox = screen.getByLabelText("Select row 0");
      fireEvent.click(rowCheckbox);
      
      expect(rowCheckbox).toBeChecked();
    });

    it("selects all rows", () => {
      render(<ManageAccountsDataTable columns={columnsWithSelection} data={mockData} />);
      
      const headerCheckbox = screen.getByLabelText("Select all");
      fireEvent.click(headerCheckbox);
      
      expect(screen.getByLabelText("Select row 0")).toBeChecked();
      expect(screen.getByLabelText("Select row 1")).toBeChecked();
      expect(screen.getByLabelText("Select row 2")).toBeChecked();
    });

    it("maintains row selection state", () => {
      render(<ManageAccountsDataTable columns={columnsWithSelection} data={mockData} />);
      
      const rowCheckbox = screen.getByLabelText("Select row 0");
      fireEvent.click(rowCheckbox);
      expect(rowCheckbox).toBeChecked();
      
      fireEvent.click(rowCheckbox);
      expect(rowCheckbox).not.toBeChecked();
    });
  });

  describe("Table structure", () => {
    it("renders all column headers", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("Name")).toBeInTheDocument();
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
        accessorKey: "name",
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting()}>Name</button>
        ),
        cell: ({ row }) => row.getValue("name"),
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
      
      const nameButton = screen.getByRole("button", { name: "Name" });
      fireEvent.click(nameButton);
      
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });

    it("toggles sort direction", () => {
      render(<ManageAccountsDataTable columns={columnsWithSorting} data={mockData} />);
      
      const nameButton = screen.getByRole("button", { name: "Name" });
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

    it("renders all names correctly", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    });
  });

  describe("State management", () => {
    it("initializes with empty sorting state", () => {
      const { rerender } = render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      
      rerender(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("initializes with empty column filters", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      expect(searchInput).toHaveValue("");
    });

    it("initializes with empty row selection", () => {
      const columnsWithSelection: ColumnDef<TestData>[] = [
        {
          id: "select",
          header: ({ table }) => (
            <input
              type="checkbox"
              aria-label="Select all"
              checked={table.getIsAllPageRowsSelected()}
              onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              aria-label={`Select row ${row.id}`}
              checked={row.getIsSelected()}
              onChange={(e) => row.toggleSelected(!!e.target.checked)}
            />
          ),
        },
        ...mockColumns,
      ];

      render(<ManageAccountsDataTable columns={columnsWithSelection} data={mockData} />);
      
      const headerCheckbox = screen.getByLabelText("Select all");
      expect(headerCheckbox).not.toBeChecked();
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