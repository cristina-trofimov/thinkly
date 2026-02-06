import {
  createAlgotime,
  getAllAlgotimeSessions,
} from "../src/api/AlgotimeAPI";

import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";

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
jest.mock("@/api/LoggerAPI");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedLogger = logFrontend as jest.Mock;

describe("AlgotimeAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAlgotime", () => {
    it("creates an algotime session", async () => {
      const payload = {
        name: "Algo Session",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
      };

      const responseData = {
        id: 1,
        message: "Created",
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: responseData,
      } as any);

      const result = await createAlgotime(payload as any);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/algotime/create",
        payload
      );

      expect(result).toEqual(responseData);
    });

    it("logs and rethrows error on failure", async () => {
      const error = new Error("Create failed");

      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(createAlgotime({} as any)).rejects.toThrow("Create failed");

      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "AlgotimeAPI",
        })
      );
    });
  });

  describe("getAllAlgotimeSessions", () => {
    it("fetches and formats algotime sessions", async () => {
      const backendResponse = [
        {
          id: 1,
          eventName: "Algo 101",
          startTime: "2026-01-01T10:00:00Z",
          endTime: "2026-01-01T11:00:00Z",
          questionCooldown: 60,
          seriesId: null,
          seriesName: null,
          questions: [
            {
              questionId: 10,
              questionName: "Two Sum",
              questionDescription: "Find two numbers",
              difficulty: "easy",
              tags: null,
              points: null,
            },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: backendResponse,
      } as any);

      const result = await getAllAlgotimeSessions();

      expect(mockedAxios.get).toHaveBeenCalledWith("/algotime/");

      expect(result).toHaveLength(1);

      const session = result[0];

      expect(session.id).toBe(1);
      expect(session.eventName).toBe("Algo 101");
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.endTime).toBeInstanceOf(Date);
      expect(session.seriesId).toBeNull();
      expect(session.seriesName).toBeNull();

      expect(session.questions).toEqual([
        {
          questionId: 10,
          questionName: "Two Sum",
          questionDescription: "Find two numbers",
          difficulty: "easy",
          tags: [],
          points: 0,
        },
      ]);
    });

    it("handles empty response safely", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: null,
      } as any);

      const result = await getAllAlgotimeSessions();

      expect(result).toEqual([]);
    });

    it("logs and rethrows error on failure", async () => {
      const error = new Error("Fetch failed");

      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getAllAlgotimeSessions()).rejects.toThrow("Fetch failed");

      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "AlgotimeAPI",
        })
      );
    });
  });
});
