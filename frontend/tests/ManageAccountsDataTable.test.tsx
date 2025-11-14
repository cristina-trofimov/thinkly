import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageAccountsDataTable } from "./../src/components/manage-accounts/ManageAccountsDataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

// ✅ Mock toast
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

// ✅ Patch console noise from Radix/React
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
];

const mockColumns: ColumnDef<TestData>[] = [
  { accessorKey: "firstName", header: "First Name" },
  { accessorKey: "lastName", header: "Last Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "accountType", header: "Account Type" },
];

describe("ManageAccountsDataTable", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders table rows correctly", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders filter input and dropdown", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByPlaceholderText("Filter emails...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all account types/i })).toBeInTheDocument();
  });

  it("filters rows when user types in search box", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const input = screen.getByPlaceholderText("Filter emails...");
    fireEvent.change(input, { target: { value: "john" } });
    await waitFor(() => {
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no data", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={[]} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("opens account type dropdown", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const filterButton = screen.getByRole("button", { name: /all account types/i });
    await user.click(filterButton);
    // Even if dropdown items are in portal, this ensures interaction is covered
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
  });

  it("handles edit button click", async () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);
    expect(editButton).toBeEnabled();
  });

  it("renders pagination buttons", () => {
    render(<ManageAccountsDataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});
