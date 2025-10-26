import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManageAccountsPage from "./../src/manage-accounts/ManageAccountsPage";
import { columns } from "./../src/manage-accounts/ManageAccountsColumns";
import type { Account } from "./../src/manage-accounts/ManageAccountsColumns";

// Mock the child components
jest.mock("./../src/manage-accounts/ManageAccountsDataTable", () => ({
  ManageAccountsDataTable: ({ data, columns }: any) => (
    <div data-testid="mock-data-table">
      <div data-testid="data-length">{data.length}</div>
      <div data-testid="columns-length">{columns.length}</div>
    </div>
  ),
}));

describe("ManageAccountsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should render without crashing", () => {
    render(<ManageAccountsPage />);
    expect(screen.getByTestId("mock-data-table")).toBeInTheDocument();
  });
});
