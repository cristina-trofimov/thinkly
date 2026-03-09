import axiosClient from "../src/lib/axiosClient";
import {
  getCurrentCompetitionLeaderboard,
  getCompetitionsDetails,
  getAllCompetitionEntries,
  getAlgoTimeEntries,
  getAllAlgoTimeEntriesForExport,
} from "../src/api/LeaderboardsAPI";
import { formatSecondsToTime } from "../src/utils/formatTime";

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "http://localhost:8000",
}));

jest.mock("@/utils/formatTime");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedFormatTime = formatSecondsToTime as jest.Mock;

describe("LeaderboardsAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFormatTime.mockImplementation((s: number) => `${s}s`);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // ─── getCurrentCompetitionLeaderboard ──────────────────────────────────────

  describe("getCurrentCompetitionLeaderboard", () => {
    it("returns empty state when no active competition", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { competition: null, entries: [] },
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

    it("omits current_user_id param when not provided", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { competition: null, entries: [] },
      } as any);

      await getCurrentCompetitionLeaderboard();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/competitions/current",
        { params: {} }
      );
    });

    it("rethrows and logs on network error", async () => {
      const err = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(err);

      await expect(getCurrentCompetitionLeaderboard()).rejects.toThrow("Network error");
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching current competition leaderboard:",
        err
      );
    });
  });

  // ─── getCompetitionsDetails ────────────────────────────────────────────────

  describe("getCompetitionsDetails", () => {
    it("maps the paginated response envelope and competitions correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 1,
          page: 1,
          page_size: 20,
          competitions: [
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
        },
      } as any);

      const result = await getCompetitionsDetails();

      expect(result).toEqual({
        total: 1,
        page: 1,
        pageSize: 20,
        competitions: [
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
        ],
      });
    });

    it("sends search, sort, page, and page_size as query params", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 2, page_size: 10, competitions: [] },
      } as any);

      await getCompetitionsDetails({
        currentUserId: 5,
        search: "Spring",
        sort: "asc",
        page: 2,
        pageSize: 10,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/competitions",
        {
          params: {
            current_user_id: 5,
            search: "Spring",
            sort: "asc",
            page: 2,
            page_size: 10,
          },
        }
      );
    });

    it("defaults to sort=desc, page=1, page_size=20 when params are omitted", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 20, competitions: [] },
      } as any);

      await getCompetitionsDetails();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/competitions",
        {
          params: { sort: "desc", page: 1, page_size: 20 },
        }
      );
    });

    it("omits search param when search is empty", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 20, competitions: [] },
      } as any);

      await getCompetitionsDetails({ search: "  " }); // whitespace only

      const calledParams = (mockedAxios.get as jest.Mock).mock.calls[0][1].params;
      expect(calledParams).not.toHaveProperty("search");
    });

    it("rethrows and logs on network error", async () => {
      const err = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(err);

      await expect(getCompetitionsDetails()).rejects.toThrow("Network error");
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching competitions leaderboard:",
        err
      );
    });
  });

  // ─── getAllCompetitionEntries ──────────────────────────────────────────────

  describe("getAllCompetitionEntries", () => {
    it("fetches all entries for a competition and maps the response", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            name: "Alice",
            userId: 10,
            points: 100,
            problemsSolved: 5,
            rank: 1,
            totalTime: 360,
          },
        ],
      } as any);

      const result = await getAllCompetitionEntries(42);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/competitions/42/all"
      );
      expect(result).toEqual([
        {
          name: "Alice",
          user_id: 10,
          total_score: 100,
          problems_solved: 5,
          rank: 1,
          total_time: "360s",
        },
      ]);
    });

    it("falls back to user_id=0 when userId is null", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          { name: "Guest", userId: null, points: 30, problemsSolved: 1, rank: 5, totalTime: 120 },
        ],
      } as any);

      const result = await getAllCompetitionEntries(1);

      expect(result[0].user_id).toBe(0);
    });

    it("returns an empty array when the response is empty", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] } as any);

      const result = await getAllCompetitionEntries(1);

      expect(result).toEqual([]);
    });

    it("rethrows and logs on network error", async () => {
      const err = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(err);

      await expect(getAllCompetitionEntries(99)).rejects.toThrow("Network error");
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching all entries for competition 99:",
        err
      );
    });
  });

  // ─── getAlgoTimeEntries (paginated) ────────────────────────────────────────

  describe("getAlgoTimeEntries", () => {
    it("maps the paginated response correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 1,
          page: 1,
          page_size: 15,
          entries: [
            {
              entryId: 1,
              algoTimeSeriesId: 2,
              name: "Carol",
              userId: 99,
              totalScore: 300,
              problemsSolved: 10,
              rank: 1,
              totalTime: 900,
              lastUpdated: "2025-05-01T00:00:00Z",
            },
          ],
        },
      } as any);

      const result = await getAlgoTimeEntries();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/algotime",
        { params: { page: 1, page_size: 15 } }
      );
      expect(result).toEqual({
        total: 1,
        page: 1,
        pageSize: 15,
        entries: [
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
        ],
      });
    });

    it("forwards search, page, pageSize, and currentUserId as query params", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 3, page_size: 10, entries: [] },
      } as any);

      await getAlgoTimeEntries({
        currentUserId: 7,
        search: "Bob",
        page: 3,
        pageSize: 10,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/leaderboards/algotime",
        {
          params: {
            current_user_id: 7,
            search: "Bob",
            page: 3,
            page_size: 10,
          },
        }
      );
    });

    it("omits search param when search is blank", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 15, entries: [] },
      } as any);

      await getAlgoTimeEntries({ search: " " });

      const params = (mockedAxios.get as jest.Mock).mock.calls[0][1].params;
      expect(params).not.toHaveProperty("search");
    });

    it("defaults to page=1, page_size=15 when params are omitted", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 15, entries: [] },
      } as any);

      await getAlgoTimeEntries();

      const params = (mockedAxios.get as jest.Mock).mock.calls[0][1].params;
      expect(params.page).toBe(1);
      expect(params.page_size).toBe(15);
    });

    it("rethrows and logs on network error", async () => {
      const err = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(err);

      await expect(getAlgoTimeEntries()).rejects.toThrow("Network error");
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching AlgoTime leaderboard entries:",
        err
      );
    });
  });

  // ─── getAllAlgoTimeEntriesForExport ────────────────────────────────────────

  describe("getAllAlgoTimeEntriesForExport", () => {
    it("fetches from /algotime/all and maps the response", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            entryId: 5,
            name: "Dave",
            userId: 22,
            totalScore: 500,
            problemsSolved: 15,
            totalTime: 1200,
            rank: 1,
          },
        ],
      } as any);

      const result = await getAllAlgoTimeEntriesForExport();

      expect(mockedAxios.get).toHaveBeenCalledWith("/leaderboards/algotime/all");
      expect(result).toEqual([
        {
          entryId: 5,
          seriesId: 0,
          name: "Dave",
          user_id: 22,
          total_score: 500,
          problems_solved: 15,
          rank: 1,
          total_time: "1200s",
        },
      ]);
    });

    it("returns an empty array when the response is empty", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] } as any);

      const result = await getAllAlgoTimeEntriesForExport();

      expect(result).toEqual([]);
    });

    it("rethrows and logs on network error", async () => {
      const err = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(err);

      await expect(getAllAlgoTimeEntriesForExport()).rejects.toThrow("Network error");
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching all AlgoTime entries for export:",
        err
      );
    });
  });
});