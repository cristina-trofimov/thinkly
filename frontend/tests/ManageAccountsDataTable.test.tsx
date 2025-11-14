import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageAccountsDataTable } from "./../src/components/manage-accounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

jest.mock("./../src/api/manageAccounts", () => ({
  deleteAccounts: jest.fn(),
}));

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

  describe("Initial Rendering", () => {
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
  });

  describe("Search Functionality", () => {
    it("filters by email", () => {
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const searchInput = screen.getByPlaceholderText("Filter emails...");
      fireEvent.change(searchInput, { target: { value: "john" } });
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    });
  });

  describe("Account Type Filtering", () => {
    it("filters by Participant", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      const participantItem = await screen.findByRole("menuitem", { name: "Participant" });
      await user.click(participantItem);

      await waitFor(() => {
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
      });
    });

    it("filters by Admin", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      const adminItem = await screen.findByRole("menuitem", { name: "Admin" });
      await user.click(adminItem);

      await waitFor(() => {
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
      });
    });

    it("filters by Owner", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      const filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      const ownerItem = await screen.findByRole("menuitem", { name: "Owner" });
      await user.click(ownerItem);

      await waitFor(() => {
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
        expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
      });
    });

    it("clears filter by selecting All", async () => {
      const user = userEvent.setup();
      render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
      let filterButton = screen.getByRole("button", { name: /All Account Types/i });
      await user.click(filterButton);
      const adminItem = await screen.findByRole("menuitem", { name: "Admin" });
      await user.click(adminItem);

      await waitFor(() => {
        expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
      });

      filterButton = screen.getByRole("button", { name: /Admin/i });
      await user.click(filterButton);
      const allItem = await screen.findByRole("menuitem", { name: "All" });
      await user.click(allItem);

      await waitFor(() => {
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      });
    });
  });
});
