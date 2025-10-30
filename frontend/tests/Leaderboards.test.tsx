import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboards } from "../src/components/leaderboards/Leaderboards";

describe("Leaderboards", () => {
  it("renders competitions sorted by newest date by default", () => {
    render(<Leaderboards />);
    const titles = screen.getAllByText(/Thinkly/).map((el) => el.textContent);
    expect(titles[0]).toContain("October"); // Newest first
  });

  it("filters competitions by search input", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);
    const input = screen.getByPlaceholderText(/search competition/i);
    await user.type(input, "September");
    expect(screen.getByText("Thinkly September Cup")).toBeInTheDocument();
    expect(screen.queryByText("Thinkly October Challenge")).not.toBeInTheDocument();
  });

  it("sorts competitions by oldest date when selected", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);

    // Click the dropdown trigger button
    const dropdownButton = screen.getByRole("button", { name: /date/i });
    await user.click(dropdownButton);

    // Wait for and click the "Oldest → Newest" option
    const oldestOption = await screen.findByRole("menuitem", { name: /oldest.*newest/i });
    await user.click(oldestOption);

    // Wait for the sort to take effect and verify the order
    await waitFor(() => {
      const titles = screen.getAllByText(/Thinkly/).map((el) => el.textContent);
      expect(titles[0]).toContain("September");
    });
  });
});