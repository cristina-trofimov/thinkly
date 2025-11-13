import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { columns } from "./../src/components/manage-accounts/ManageAccountsColumns";
import type { Account } from "./../src/types/Account";

const mockAccount: Account = {
  id: 1,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  accountType: "Admin",
};

const createMockTable = (overrides = {}) => ({
  getIsAllRowsSelected: jest.fn(() => false),
  getIsSomeRowsSelected: jest.fn(() => false),
  toggleAllRowsSelected: jest.fn(),
  options: { meta: {} },
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
      const table = createMockTable({ getIsAllRowsSelected: () => true });
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);
      
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("renders header checkbox indeterminate when some selected", () => {
      const table = createMockTable({ getIsSomeRowsSelected: () => true });
      const Header = selectColumn.header as Function;
      const { container } = render(<>{Header({ table })}</>);
      
      expect(container.querySelector('[data-state="indeterminate"]')).toBeInTheDocument();
    });

    it("toggles all rows on header checkbox change", () => {
      const table = createMockTable();
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);
      
      fireEvent.click(screen.getByRole("checkbox"));
      expect(table.toggleAllRowsSelected).toHaveBeenCalledWith(true);
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

    it("renders name with initials from firstName and lastName", () => {
      const row = createMockRow();
      const Cell = nameColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByText("JD")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("handles single firstName only", () => {
      const row = createMockRow({
        original: { ...mockAccount, firstName: "John", lastName: "" },
      });
      const Cell = nameColumn.cell as Function;
      render(<>{Cell({ row })}</>);
      
      expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("handles empty firstName and lastName", () => {
      const row = createMockRow({
        original: { ...mockAccount, firstName: "", lastName: "" },
      });
      const Cell = nameColumn.cell as Function;
      const { container } = render(<>{Cell({ row })}</>);
      
      // Check that the name span exists and is empty
      const nameSpan = container.querySelector('.font-semibold');
      expect(nameSpan).toBeInTheDocument();
      expect(nameSpan?.textContent).toBe("");
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
      const table = createMockTable();
      
      // Need to render in a proper React component context for hooks to work
      const TestComponent = () => {
        const Cell = actionsColumn.cell as Function;
        return <>{Cell({ row, table })}</>;
      };
      
      render(<TestComponent />);
      
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("opens edit dialog when Edit User is clicked", async () => {
      const user = userEvent.setup();
      const row = createMockRow();
      const table = createMockTable();
      
      const TestComponent = () => {
        const Cell = actionsColumn.cell as Function;
        return <>{Cell({ row, table })}</>;
      };
      
      render(<TestComponent />);
      
      const button = screen.getByRole("button");
      await user.click(button);
      
      // Wait for dropdown to appear
      const editMenuItem = await screen.findByText("Edit User");
      await user.click(editMenuItem);
      
      expect(await screen.findByText("Make changes to the user account here.")).toBeInTheDocument();
    });
  });
});