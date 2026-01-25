import {
  getDashboardOverview,
  getNewAccountsStats,
  getQuestionsSolvedStats,
  getTimeToSolveStats,
  getLoginsStats,
  getParticipationStats,
} from "../src/api/AdminDashboardAPI";

import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";

jest.mock("@/lib/axiosClient");
jest.mock("@/api/LoggerAPI");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedLogger = logFrontend as jest.Mock;

describe("AdminDashboardAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboardOverview", () => {
    it("returns dashboard overview data", async () => {
      const mockData = { users: [], competitions: [] };

      mockedAxios.get.mockResolvedValueOnce({ data: mockData } as any);

      const result = await getDashboardOverview();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/admin/dashboard/overview"
      );
      expect(result).toEqual(mockData);
    });

    it("logs and rethrows error", async () => {
      const error = new Error("Network error");

      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getDashboardOverview()).rejects.toThrow("Network error");

      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "AdminDashboardAPI",
        })
      );
    });
  });

  describe("getNewAccountsStats", () => {
    it("calls API with default time range", async () => {
      const mockData = { total: 10 };

      mockedAxios.get.mockResolvedValueOnce({ data: mockData } as any);

      const result = await getNewAccountsStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/admin/dashboard/stats/new-accounts",
        { params: { time_range: "3months" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getQuestionsSolvedStats", () => {
    it("fetches questions solved stats", async () => {
      const mockData = [{ difficulty: "easy", count: 5 }];

      mockedAxios.get.mockResolvedValueOnce({ data: mockData } as any);

      const result = await getQuestionsSolvedStats("3months");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/admin/dashboard/stats/questions-solved",
        { params: { time_range: "3months" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getTimeToSolveStats", () => {
    it("fetches time to solve stats", async () => {
      const mockData = [{ difficulty: "medium", avgTime: 120 }];

      mockedAxios.get.mockResolvedValueOnce({ data: mockData } as any);

      const result = await getTimeToSolveStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/admin/dashboard/stats/time-to-solve",
        { params: { time_range: "3months" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getLoginsStats", () => {
    it("fetches login stats", async () => {
      const mockData = [{ date: "2026-01-01", count: 20 }];

      mockedAxios.get.mockResolvedValueOnce({ data: mockData } as any);

      const result = await getLoginsStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/admin/dashboard/stats/logins",
        { params: { time_range: "3months" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getParticipationStats", () => {
    it("fetches participation stats with event type", async () => {
      const mockData = [{ date: "2026-01-01", participants: 15 }];

      mockedAxios.get.mockResolvedValueOnce({ data: mockData } as any);

      const result = await getParticipationStats("3months", "competitions");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/admin/dashboard/stats/participation",
        {
          params: {
            time_range: "3months",
            event_type: "competitions",
          },
        }
      );
      expect(result).toEqual(mockData);
    });
  });
});
