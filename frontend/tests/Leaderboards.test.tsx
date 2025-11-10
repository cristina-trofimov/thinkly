import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboards } from "../src/components/leaderboards/Leaderboards";

jest.mock('../src/config', () => ({
  config: { backendUrl: 'http://localhost:8000' },
}));

const mockCompetitions = [
  { id: "1", name: "Competition A", date: "2025-09-15", participants: [] },
  { id: "2", name: "Competition B", date: "2025-10-31", participants: [] },
];

beforeEach(() => {
  // Mock fetch for Leaderboards component
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockCompetitions),
    } as Response)
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("Leaderboards", () => {
  it("renders competitions sorted by newest date by default", async () => {
    render(<Leaderboards />);

    // Wait for the fetch to complete and competitions to render
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/leaderboards/",
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        })
      );
    });

    // Wait for both competition names to appear in the document
    await waitFor(() => {
      expect(screen.getByText("Competition A")).toBeInTheDocument();
      expect(screen.getByText("Competition B")).toBeInTheDocument();
    });

    // Get all elements containing competition text
    const compA = screen.getByText("Competition A");
    const compB = screen.getByText("Competition B");

    // Check that Competition B appears before Competition A in the DOM
    // (newest first by default)
    const allText = document.body.textContent || "";
    const indexA = allText.indexOf("Competition A");
    const indexB = allText.indexOf("Competition B");

    expect(indexB).toBeLessThan(indexA);
  });

  it("filters competitions by search input", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);

    // Wait for competitions to load
    await waitFor(() => {
      expect(screen.getByText("Competition A")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search competition/i);

    // Type "Competition A" to filter
    await user.clear(input);
    await user.type(input, "Competition A");

    // Wait for filtering to take effect
    await waitFor(() => {
      expect(screen.getByText("Competition A")).toBeInTheDocument();
      expect(screen.queryByText("Competition B")).not.toBeInTheDocument();
    });
  });

  it("sorts competitions by oldest date when selected", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);

    // Wait for competitions to render
    await waitFor(() => {
      expect(screen.getByText("Competition A")).toBeInTheDocument();
    });

    // Click the dropdown trigger button
    const dropdownButton = screen.getByRole("button", { name: /date/i });
    await user.click(dropdownButton);

    // Wait for dropdown menu to appear and click the "Oldest → Newest" option
    const oldestOption = await screen.findByRole("menuitem", { name: /oldest.*newest/i });
    await user.click(oldestOption);

    // Wait for sort to take effect and check order
    await waitFor(() => {
      const allText = document.body.textContent || "";
      const indexA = allText.indexOf("Competition A");
      const indexB = allText.indexOf("Competition B");

      // Competition A (September) should come before Competition B (October)
      expect(indexA).toBeLessThan(indexB);
    });
  });

  it("displays empty state when no competitions match search", async () => {
    const user = userEvent.setup();
    render(<Leaderboards />);

    // Wait for competitions to load
    await waitFor(() => {
      expect(screen.getByText("Competition A")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search competition/i);

    // Type something that doesn't match
    await user.clear(input);
    await user.type(input, "Nonexistent Competition");

    // Wait for filtering to take effect
    await waitFor(() => {
      expect(screen.queryByText("Competition A")).not.toBeInTheDocument();
      expect(screen.queryByText("Competition B")).not.toBeInTheDocument();
    });
  });

  it("handles fetch errors gracefully", async () => {
    // Mock console.error to avoid cluttering test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock fetch to reject
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));

    render(<Leaderboards />);

    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error loading leaderboards:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("renders search bar and filter controls", () => {
    render(<Leaderboards />);

    expect(screen.getByPlaceholderText(/search competition/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /date/i })).toBeInTheDocument();
  });
});
