import { render, screen, fireEvent } from "@testing-library/react";
import { SearchAndFilterBar } from "../src/components/leaderboards/SearchAndFilterBar";

// Mock the Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: unknown) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock the Input component
jest.mock("@/components/ui/input", () => ({
  Input: (props: unknown) => <input {...props} />,
}));

// Mock the entire dropdown menu module
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: unknown) => {
    if (asChild) {
      return <>{children}</>;
    }
    return <button>{children}</button>;
  },
  DropdownMenuContent: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: unknown) => (
    <div onClick={onClick} role="menuitem">
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: unknown) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// Mock lucide-react icons - only Filter is used
jest.mock("lucide-react", () => ({
  Filter: ({ className }: unknown) => <span data-testid="filter-icon" className={className} />,
}));

describe("SearchAndFilterBar", () => {
  it("calls setSearch on input change", () => {
    const mockSetSearch = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={mockSetSearch}
        sortAsc={false}
        setSortAsc={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText(/search competition/i);
    fireEvent.change(input, {
      target: { value: "test" },
    });
    expect(mockSetSearch).toHaveBeenCalledWith("test");
  });

  it("changes sorting when dropdown option is selected", () => {
    const mockSetSortAsc = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={jest.fn()}
        sortAsc={false}
        setSortAsc={mockSetSortAsc}
      />
    );

    // Click the "Oldest → Newest" option
    const oldestOption = screen.getByText(/Oldest → Newest/i);
    fireEvent.click(oldestOption);

    expect(mockSetSortAsc).toHaveBeenCalledWith(true);
  });

  it("displays correct sort label based on sortAsc prop", () => {
    const { rerender } = render(
      <SearchAndFilterBar
        search=""
        setSearch={jest.fn()}
        sortAsc={false}
        setSortAsc={jest.fn()}
      />
    );

    expect(screen.getByText(/Date: Newest → Oldest/i)).toBeInTheDocument();

    rerender(
      <SearchAndFilterBar
        search=""
        setSearch={jest.fn()}
        sortAsc={true}
        setSortAsc={jest.fn()}
      />
    );

    expect(screen.getByText(/Date: Oldest → Newest/i)).toBeInTheDocument();
  });
});