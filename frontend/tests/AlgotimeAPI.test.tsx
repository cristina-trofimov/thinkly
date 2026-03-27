import {
  createAlgotime,
  getAlgotimeSessionsPage,
  getAllAlgotimeSessions,
} from "../src/api/AlgotimeAPI";

import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";
import { getAlgotimeById, updateAlgotime, deleteAlgotime } from '../src/api/AlgotimeAPI';

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

  describe("getAlgotimeSessionsPage", () => {
    it("fetches and formats a paginated algotime response", async () => {
      const backendResponse = {
        total: 1,
        page: 1,
        page_size: 12,
        items: [
          {
            id: 1,
            eventName: "Algo 101",
            startTime: "2026-01-01T10:00:00Z",
            endTime: "2026-01-01T11:00:00Z",
            questionCooldown: 60,
            location: null,
            seriesId: null,
            seriesName: null,
            questionCount: 1,
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: backendResponse,
      } as any);

      const result = await getAlgotimeSessionsPage();

      expect(mockedAxios.get).toHaveBeenCalledWith("/algotime/", {
        params: {
          page: 1,
          page_size: 12,
          search: undefined,
          sort: "desc",
          status: undefined,
        },
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(12);

      const session = result.items[0];

      expect(session.id).toBe(1);
      expect(session.eventName).toBe("Algo 101");
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.endTime).toBeInstanceOf(Date);
      expect(session.seriesId).toBeNull();
      expect(session.seriesName).toBeNull();
      expect(session.questionCount).toBe(1);
      expect(session.questions).toEqual([]);
    });

    it("passes through page params correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 0,
          page: 2,
          page_size: 24,
          items: [],
        },
      } as any);

      const result = await getAlgotimeSessionsPage({
        page: 2,
        pageSize: 24,
        search: "algo",
        sort: "asc",
        status: "upcoming",
      });

      expect(mockedAxios.get).toHaveBeenCalledWith("/algotime/", {
        params: {
          page: 2,
          page_size: 24,
          search: "algo",
          sort: "asc",
          status: "upcoming",
        },
      });

      expect(result).toEqual({
        total: 0,
        page: 2,
        pageSize: 24,
        items: [],
      });
    });

    it("logs and rethrows error on failure", async () => {
      const error = new Error("Fetch failed");

      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getAlgotimeSessionsPage()).rejects.toThrow("Fetch failed");

      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "AlgotimeAPI",
        })
      );
    });
  });

  describe("getAllAlgotimeSessions", () => {
    it("aggregates all pages of algotime sessions", async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            total: 3,
            page: 1,
            page_size: 2,
            items: [
              {
                id: 1,
                eventName: "Algo 101",
                startTime: "2026-01-01T10:00:00Z",
                endTime: "2026-01-01T11:00:00Z",
                questionCooldown: 60,
                location: null,
                seriesId: null,
                seriesName: null,
                questionCount: 1,
              },
              {
                id: 2,
                eventName: "Algo 102",
                startTime: "2026-01-02T10:00:00Z",
                endTime: "2026-01-02T11:00:00Z",
                questionCooldown: 60,
                location: null,
                seriesId: null,
                seriesName: null,
                questionCount: 2,
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            total: 3,
            page: 2,
            page_size: 2,
            items: [
              {
                id: 3,
                eventName: "Algo 103",
                startTime: "2026-01-03T10:00:00Z",
                endTime: "2026-01-03T11:00:00Z",
                questionCooldown: 60,
                location: null,
                seriesId: null,
                seriesName: null,
                questionCount: 3,
              },
            ],
          },
        } as any);

      const result = await getAllAlgotimeSessions();

      expect(mockedAxios.get).toHaveBeenNthCalledWith(1, "/algotime/", {
        params: {
          page: 1,
          page_size: 12,
          search: undefined,
          sort: "desc",
          status: undefined,
        },
      });
      expect(mockedAxios.get).toHaveBeenNthCalledWith(2, "/algotime/", {
        params: {
          page: 2,
          page_size: 2,
          search: undefined,
          sort: "desc",
          status: undefined,
        },
      });

      expect(result).toHaveLength(3);
      expect(result.map((session) => session.id)).toEqual([1, 2, 3]);
    });

    it("handles empty response safely", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 0,
          page: 1,
          page_size: 12,
          items: [],
        },
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

  describe("getAlgotimeById", () => {
    it("fetches and formats a single session", async () => {
      const backendResponse = {
        id: 1,
        eventName: "Algo 101",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
        questionCooldown: 300,
        location: "Room 101",
        questions: [{ questionId: 1 }],
      };
  
      mockedAxios.get.mockResolvedValueOnce({ data: backendResponse } as any);
  
      const result = await getAlgotimeById(1);
  
      expect(mockedAxios.get).toHaveBeenCalledWith("/algotime/1");
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.location).toBe("Room 101");
      expect(result.eventName).toBe("Algo 101");
    });
  
    it("defaults location to empty string when null", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 1,
          eventName: "Algo 101",
          startTime: "2026-01-01T10:00:00Z",
          endTime: "2026-01-01T11:00:00Z",
          location: null,
        },
      } as any);
  
      const result = await getAlgotimeById(1);
  
      expect(result.location).toBe("");
    });
  
    it("logs and rethrows error on failure", async () => {
      const error = new Error("Fetch failed");
      mockedAxios.get.mockRejectedValueOnce(error);
  
      await expect(getAlgotimeById(1)).rejects.toThrow("Fetch failed");
  
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: "ERROR", component: "AlgotimeAPI" })
      );
    });
  });
  
  describe("updateAlgotime", () => {
    it("sends update request and returns data", async () => {
      const payload = {
        name: "Updated Session",
        date: "2026-01-01",
        startTime: "10:00",
        endTime: "11:00",
        selectedQuestions: [1, 2],
      };
      const responseData = { id: 1, eventName: "Updated Session" };
  
      mockedAxios.put.mockResolvedValueOnce({ data: responseData } as any);
  
      const result = await updateAlgotime(1, payload as any);
  
      expect(mockedAxios.put).toHaveBeenCalledWith("/algotime/1", payload);
      expect(result).toEqual(responseData);
    });
  
    it("logs and rethrows error on failure", async () => {
      const error = new Error("Update failed");
      mockedAxios.put.mockRejectedValueOnce(error);
  
      await expect(updateAlgotime(1, {} as any)).rejects.toThrow("Update failed");
  
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: "ERROR", component: "AlgotimeAPI" })
      );
    });
  });
  
  describe("deleteAlgotime", () => {
    it("sends delete request successfully", async () => {
      mockedAxios.delete.mockResolvedValueOnce({} as any);
  
      await deleteAlgotime(1);
  
      expect(mockedAxios.delete).toHaveBeenCalledWith("/algotime/1");
    });
  
    it("logs and rethrows error on failure", async () => {
      const error = new Error("Delete failed");
      mockedAxios.delete.mockRejectedValueOnce(error);
  
      await expect(deleteAlgotime(1)).rejects.toThrow("Delete failed");
  
      expect(mockedLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: "ERROR", component: "AlgotimeAPI" })
      );
    });
  });
});
