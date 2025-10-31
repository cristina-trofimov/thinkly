import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const user = userEvent.setup();
    const mockSetSortAsc = jest.fn();
    render(
      <SearchAndFilterBar
        search=""
        setSearch={jest.fn()}
        sortAsc={false}
        setSortAsc={mockSetSortAsc}
      />
    );

    // Click to open dropdown using userEvent
    const dropdownButton = screen.getByRole("button", { name: /date/i });
    await user.click(dropdownButton);

    // Wait for dropdown content to appear in the portal
    const oldestOption = await screen.findByText(/Oldest → Newest/);
    await user.click(oldestOption);

    expect(mockSetSortAsc).toHaveBeenCalledWith(true);
  });
});