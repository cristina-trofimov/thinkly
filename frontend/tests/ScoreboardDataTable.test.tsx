import { render, screen, fireEvent, within } from "@testing-library/react";
import { SearchAndFilterBar } from "../src/components/leaderboards/SearchAndFilterBar";


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
    fireEvent.change(screen.getByPlaceholderText(/search competition/i), {
      target: { value: "test" },
    });
    expect(mockSetSearch).toHaveBeenCalledWith("test");
  });

  it("changes sorting when dropdown option is selected", async () => {
    const mockSetSortAsc = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={jest.fn()}
        sortAsc={false}
        setSortAsc={mockSetSortAsc}
      />
    );

    // Click to open dropdown
    fireEvent.click(screen.getByRole("button", { name: /date/i }));

    // 🔑 Search inside document.body (where Radix portal renders)
    const dropdown = within(document.body);
    fireEvent.click(dropdown.getByText(/Oldest → Newest/));

    expect(mockSetSortAsc).toHaveBeenCalledWith(true);
  });
});
