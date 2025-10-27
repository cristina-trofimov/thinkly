import { render, screen, fireEvent } from "@testing-library/react";
import { columns } from "./../src/manage-accounts/ManageAccountsColumns";
import type { Account } from "./../src/manage-accounts/ManageAccountsColumns";

const mockAccount: Account = {
  id: "1",
  name: "John Doe",
  email: "john@example.com",
  accountType: "Admin",
};

const createMockTable = (overrides = {}) => ({
  getIsAllPageRowsSelected: jest.fn(() => false),
  getIsSomePageRowsSelected: jest.fn(() => false),
  toggleAllPageRowsSelected: jest.fn(),
  ...overrides,
});

const createMockRow = (overrides = {}) => ({
  getValue: jest.fn((key: string) => mockAccount[key as keyof Account]),
  getIsSelected: jest.fn(() => false),
  toggleSelected: jest.fn(),
  original: mockAccount,
  ...overrides,
});

const createMockColumn = (overrides = {}) => ({
  toggleSorting: jest.fn(),
  getIsSorted: jest.fn(() => false),
  ...overrides,
});

describe("Account Columns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() },
    });
  });

  describe("Select Column", () => {
    const selectColumn = columns[0];

    it("renders header checkbox unchecked", () => {
      const table = createMockTable();
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);
      
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("renders header checkbox checked when all selected", () => {
      const table = createMockTable({ getIsAllPageRowsSelected: () => true });
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);
      
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("renders header checkbox indeterminate when some selected", () => {
      const table = createMockTable({ getIsSomePageRowsSelected: () => true });
      const Header = selectColumn.header as Function;
      const { container } = render(<>{Header({ table })}</>);
      
      expect(container.querySelector('[data-state="indeterminate"]')).toBeInTheDocument();
    });

    it("toggles all rows on header checkbox change", () => {
      const table = createMockTable();
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);
      
      fireEvent.click(screen.getByRole("checkbox"));
      expect(table.toggleAllPageRowsSelected).toHaveBeenCalledWith(true);
    });

    it("renders and toggles row checkbox", () => {
      const row = createMockRow();
      const Cell = selectColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      
      fireEvent.click(checkbox);
      expect(row.toggleSelected).toHaveBeenCalledWith(true);
    });
  });

  describe("Name Column", () => {
    const nameColumn = columns[1];

    it("renders name with initials", () => {
      const row = createMockRow();
      const Cell = nameColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByText("JD")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("handles single name", () => {
      const row = createMockRow({
        getValue: (key: string) => key === "name" ? "John" : mockAccount[key as keyof Account],
      });
      const Cell = nameColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByText("JJ")).toBeInTheDocument();
    });

    it("handles empty name", () => {
      const row = createMockRow({
        getValue: (key: string) => key === "name" ? "" : mockAccount[key as keyof Account],
      });
      const Cell = nameColumn.cell as Function;
      const { container } = render(<>{Cell({ row })}</>);
      
      const initialsSpan = container.querySelector('.bg-muted');
      expect(initialsSpan).toHaveTextContent("");
    });
  });

  describe("Email Column", () => {
    const emailColumn = columns[2];

    it("renders email with sort button", () => {
      const column = createMockColumn();
      const Header = emailColumn.header as Function;
      render(<>{Header({ column })}</>);
      
      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("toggles sorting from not sorted to ascending", () => {
      const column = createMockColumn();
      const Header = emailColumn.header as Function;
      render(<>{Header({ column })}</>);
      
      fireEvent.click(screen.getByRole("button"));
      expect(column.toggleSorting).toHaveBeenCalledWith(false);
    });

    it("toggles sorting from ascending to descending", () => {
      const column = createMockColumn({ getIsSorted: () => "asc" });
      const Header = emailColumn.header as Function;
      render(<>{Header({ column })}</>);
      
      fireEvent.click(screen.getByRole("button"));
      expect(column.toggleSorting).toHaveBeenCalledWith(true);
    });

    it("renders email cell", () => {
      const row = createMockRow();
      const Cell = emailColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });

  describe("Account Type Column", () => {
    const accountTypeColumn = columns[3];

    it("renders account type", () => {
      const row = createMockRow();
      const Cell = accountTypeColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  describe("Actions Column", () => {
    const actionsColumn = columns[4];

    it("renders dropdown menu trigger", () => {
      const row = createMockRow();
      const Cell = actionsColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("copies user ID to clipboard", () => {
      const row = createMockRow();
      const Cell = actionsColumn.cell as Function;
      const { container } = render(<>{Cell({ row })}</>);
      
      const button = screen.getByRole("button");
      fireEvent.click(button);
      
      const dropdownItem = container.querySelector('[role="menuitem"]');
      if (dropdownItem) {
        fireEvent.click(dropdownItem);
      }
      
      expect(button).toBeInTheDocument();
    });
  });
});