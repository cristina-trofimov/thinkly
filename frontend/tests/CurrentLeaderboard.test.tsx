import { render, screen, waitFor } from "@testing-library/react";
import { CurrentLeaderboard, CurrentStandings } from "../src/components/leaderboards/CurrentLeaderboard";
import axiosClient from "@/lib/axiosClient";
import React from "react";
import userEvent from "@testing-library/user-event";
import { Participant } from "../src/components/interfaces/Participant";
import { Competition } from "../src/components/interfaces/Competition";

// Mock axios
jest.mock("@/lib/axiosClient");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

describe("CurrentLeaderboard Component", () => {
  const mockStandings: CurrentStandings = {
    competition_name: "Algo Competition",
    participants: [
    {user_id: 1, username: "alice123", name: "Alice", total_score: 900, rank: 7, problems_solved: 10} as Participant,
    {user_id: 2, username: "bob456", name: "Bob", total_score: 1200, rank: 1, problems_solved: 12} as Participant,
  ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<CurrentLeaderboard />);
    expect(screen.getByText(/Loading current standings/i)).toBeInTheDocument();
  });

  it("renders standings after successful fetch", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockStandings });

    render(<CurrentLeaderboard />);

    // Wait for data to be rendered
    await waitFor(() => {
      expect(screen.getByText("Algo Competition")).toBeInTheDocument();
      expect(screen.getByText(/Live Standings/i)).toBeInTheDocument();
    });

    // Check if participant names are rendered
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders error message if fetch fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    render(<CurrentLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load current standings/i)).toBeInTheDocument();
    });
  });

  it("renders no active competition when participants array is empty", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { competition_name: "Empty Comp", participants: [] } });

    render(<CurrentLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText(/No active competition/i)).toBeInTheDocument();
    });
  });
});
