import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboards } from "../src/components/leaderboards/Leaderboards";
jest.mock('../src/config', () => ({
  config: { backendUrl: 'http://localhost:8000' },
}));
beforeEach(() => {
  // Mock fetch for Leaderboards component
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve([
          { id: "1", name: "Competition A", date: "2025-09-15", participants: [] },
          { id: "2", name: "Competition B", date: "2025-10-31", participants: [] },
        ]),
    } as unknown)
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("Leaderboards", () => {
  it("renders competitions sorted by newest date by default", async () => {
    render(<Leaderboards />);

    // Wait for competitions to render
    const titles = await screen.findAllByText(/Competition/);
    const textContents = titles.map((el) => el.textContent);

    // Check newest first (October = Competition B)
    expect(textContents[0]).toBe("Competition B");
    expect(textContents[1]).toBe("Competition A");
  });

  it("filters competitions by search input", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);

    const input = screen.getByPlaceholderText(/search competition/i);

    // Type "Competition A" to filter
    await user.type(input, "Competition A");

    expect(await screen.findByText("Competition A")).toBeInTheDocument();
    expect(screen.queryByText("Competition B")).not.toBeInTheDocument();
  });

  it("sorts competitions by oldest date when selected", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);

    // Wait for competitions to render
    await screen.findByText("Competition A");

    // Click the dropdown trigger button
    const dropdownButton = screen.getByRole("button", { name: /date/i });
    await user.click(dropdownButton);

    // Click the "Oldest → Newest" option
    const oldestOption = await screen.findByRole("menuitem", { name: /oldest.*newest/i });
    await user.click(oldestOption);

    // Wait for sort to take effect and check order
    await waitFor(() => {
      const titles = screen.getAllByText(/Competition/).map((el) => el.textContent);
      expect(titles[0]).toBe("Competition A"); // September
      expect(titles[1]).toBe("Competition B"); // October
    });
  });
});
