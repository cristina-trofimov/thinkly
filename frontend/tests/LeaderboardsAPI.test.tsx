import axiosClient from "../src/lib/axiosClient";
import {
  getCurrentCompetitionLeaderboard,
  getCompetitionsDetails,
  getAllAlgoTimeEntries,
} from "../src/api/LeaderboardsAPI";
import { formatSecondsToTime } from "../src/utils/formatTime";

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
jest.mock("@/utils/formatTime");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedFormatTime = formatSecondsToTime as jest.Mock;

describe("LeaderboardsAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFormatTime.mockImplementation((s: number) => `${s}s`);
  });

  describe("getCurrentCompetitionLeaderboard", () => {
    it("returns empty state when no active competition", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          competition: null,
          entries: [],
        },
      } as any);

      const result = await getCurrentCompetitionLeaderboard();

      expect(result).toEqual({
        competitionName: "No Active Competition",
        participants: [],
        showSeparator: false,
      });
    });

    it("formats active competition leaderboard correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          competition: {
            id: 1,
            name: "Winter Contest",
            startDate: "2025-01-01",
            endDate: "2025-01-02",
          },
          entries: [
            {
              entryId: 1,
              name: "Alice",
              userId: 10,
              totalScore: 120,
              problemsSolved: 5,
              rank: 1,
              totalTime: 360,
            },
          ],
          showSeparator: true,
        },
      } as any);

      const result = await getCurrentCompetitionLeaderboard(10);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/competitions/current",
        { params: { current_user_id: 10 } }
      );

      expect(result).toEqual({
        competitionName: "Winter Contest",
        participants: [
          {
            name: "Alice",
            user_id: 10,
            total_score: 120,
            problems_solved: 5,
            rank: 1,
            total_time: "360s",
          },
        ],
        showSeparator: true,
      });
    });
  });

  describe("getCompetitionsDetails", () => {
    it("maps competitions and participants correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            id: "1",
            name: "Spring Contest",
            date: "2025-03-01T00:00:00Z",
            participants: [
              {
                name: "Bob",
                userId: null,
                points: 50,
                problemsSolved: 2,
                rank: 3,
                totalTime: 200,
              },
            ],
            showSeparator: true,
          },
        ],
      } as any);

      const result = await getCompetitionsDetails();

      expect(result).toEqual([
        {
          id: 1,
          competitionTitle: "Spring Contest",
          date: new Date("2025-03-01T00:00:00Z"),
          participants: [
            {
              name: "Bob",
              user_id: 0,
              total_score: 50,
              problems_solved: 2,
              rank: 3,
              total_time: "200s",
            },
          ],
          showSeparator: true,
        },
      ]);
    });
  });

  describe("getAllAlgoTimeEntries", () => {
    it("maps AlgoTime leaderboard entries correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            entryId: 1,
            algoTimeSeriesId: 2,
            name: "Carol",
            userId: 99,
            totalScore: 300,
            problemsSolved: 10,
            rank: 1,
            totalTime: 900,
          },
        ],
      } as any);

      const result = await getAllAlgoTimeEntries();

      expect(mockedAxios.get).toHaveBeenCalledWith("/leaderboards/algotime");

      expect(result).toEqual([
        {
          entryId: 1,
          seriesId: 2,
          name: "Carol",
          user_id: 99,
          total_score: 300,
          problems_solved: 10,
          rank: 1,
          total_time: "900s",
        },
      ]);
    });
  });
});
