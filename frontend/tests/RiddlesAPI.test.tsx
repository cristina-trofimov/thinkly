// __tests__/RiddlesAPI.test.ts
import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";
import {
  getRiddles,
  createRiddle,
  updateRiddle,
  deleteRiddle,
  getRiddleById,
  type CreateRiddleParams,
  type UpdateRiddleParams,
} from "../src/api/RiddlesAPI";
import type { Riddle } from "../src/types/riddle/Riddle.type";

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

jest.mock("../src/api/LoggerAPI", () => ({
  __esModule: true,
  logFrontend: jest.fn(),
}));

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedLog = logFrontend as jest.MockedFunction<typeof logFrontend>;

describe("RiddlesAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRiddles", () => {
    it("fetches and formats riddles correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [{ riddle_id: 1, riddle_question: "Q?", riddle_answer: "A", riddle_file: null }],
      } as any);

      const result = await getRiddles();

      expect(mockedAxios.get).toHaveBeenCalledWith("/riddles/");
      expect(result).toEqual<Riddle[]>([{ id: 1, question: "Q?", answer: "A", file: null }]);
    });

    it("logs and throws on error", async () => {
      const error = new Error("Network failed");
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getRiddles()).rejects.toThrow("Network failed");
      expect(mockedLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed fetch riddles"),
          component: "RiddlesAPI.ts",
        })
      );
    });
  });

  describe("createRiddle", () => {
    const params: CreateRiddleParams = { question: "Q2?", answer: "A2", file: null };

    it("creates and returns new riddle (multipart/form-data)", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { riddle_id: 2, riddle_question: "Q2?", riddle_answer: "A2", riddle_file: null },
      } as any);

      const result = await createRiddle(params);

      // ✅ now sends FormData + config (NOT the params object)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/riddles/create",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );

      // Optional: verify FormData content
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(form.get("question")).toBe("Q2?");
      expect(form.get("answer")).toBe("A2");
      expect(form.get("file")).toBeNull();

      expect(result).toEqual<Riddle>({ id: 2, question: "Q2?", answer: "A2", file: null });
    });

    it("creates with a file when provided", async () => {
      const file = new File(["hello"], "hint.txt", { type: "text/plain" });

      mockedAxios.post.mockResolvedValueOnce({
        data: { riddle_id: 9, riddle_question: "Qf?", riddle_answer: "Af", riddle_file: "hint.txt" },
      } as any);

      const result = await createRiddle({ question: "Qf?", answer: "Af", file });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/riddles/create",
        expect.any(FormData),
        expect.any(Object)
      );

      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(form.get("question")).toBe("Qf?");
      expect(form.get("answer")).toBe("Af");
      expect(form.get("file")).toBe(file);

      expect(result).toEqual<Riddle>({ id: 9, question: "Qf?", answer: "Af", file: "hint.txt" });
    });

    it("logs and throws on error", async () => {
      const error = new Error("Create failed");
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(createRiddle(params)).rejects.toThrow("Create failed");
      expect(mockedLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to create riddle"),
          component: "RiddlesAPI.ts",
        })
      );
    });
  });

  describe("updateRiddle", () => {
    it("updates question/answer only (multipart/form-data)", async () => {
      mockedAxios.put.mockResolvedValueOnce({
        data: { riddle_id: 5, riddle_question: "NewQ", riddle_answer: "NewA", riddle_file: null },
      } as any);

      const params: UpdateRiddleParams = { riddleId: 5, question: "NewQ", answer: "NewA" };
      const result = await updateRiddle(params);

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "/riddles/5",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );

      const form = mockedAxios.put.mock.calls[0][1] as FormData;
      expect(form.get("question")).toBe("NewQ");
      expect(form.get("answer")).toBe("NewA");
      expect(form.get("remove_file")).toBeNull();
      expect(form.get("file")).toBeNull();

      expect(result).toEqual<Riddle>({ id: 5, question: "NewQ", answer: "NewA", file: null });
    });

    it("sends remove_file in snake_case when removeFile is provided", async () => {
      mockedAxios.put.mockResolvedValueOnce({
        data: { riddle_id: 6, riddle_question: "Q", riddle_answer: "A", riddle_file: null },
      } as any);

      const result = await updateRiddle({ riddleId: 6, removeFile: true });

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "/riddles/6",
        expect.any(FormData),
        expect.any(Object)
      );

      const form = mockedAxios.put.mock.calls[0][1] as FormData;
      expect(form.get("remove_file")).toBe("true"); // String(params.removeFile)
      expect(result).toEqual<Riddle>({ id: 6, question: "Q", answer: "A", file: null });
    });

    it("replaces file when file is provided", async () => {
      const file = new File(["x"], "new.png", { type: "image/png" });

      mockedAxios.put.mockResolvedValueOnce({
        data: { riddle_id: 7, riddle_question: "Q", riddle_answer: "A", riddle_file: "new.png" },
      } as any);

      const result = await updateRiddle({ riddleId: 7, file });

      const form = mockedAxios.put.mock.calls[0][1] as FormData;
      expect(form.get("file")).toBe(file);

      expect(result).toEqual<Riddle>({ id: 7, question: "Q", answer: "A", file: "new.png" });
    });

    it("logs and throws on error", async () => {
      const error = new Error("Update failed");
      mockedAxios.put.mockRejectedValueOnce(error);

      await expect(updateRiddle({ riddleId: 7, question: "x" })).rejects.toThrow("Update failed");
      expect(mockedLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to update riddle"),
          component: "RiddlesAPI.ts",
        })
      );
    });
  });

  describe("deleteRiddle", () => {
    it("calls axios delete with correct URL", async () => {
      mockedAxios.delete.mockResolvedValueOnce({} as any);

      await deleteRiddle(3);
      expect(mockedAxios.delete).toHaveBeenCalledWith("/riddles/3");
    });

    it("logs and throws on error", async () => {
      const error = new Error("Delete failed");
      mockedAxios.delete.mockRejectedValueOnce(error);

      await expect(deleteRiddle(3)).rejects.toThrow("Delete failed");
      expect(mockedLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to delete riddle"),
          component: "RiddlesAPI.ts",
        })
      );
    });
  });

  describe("getRiddleById", () => {
    it("fetches single riddle correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { riddle_id: 4, riddle_question: "Q4?", riddle_answer: "A4", riddle_file: null },
      } as any);

      const result = await getRiddleById(4);

      expect(mockedAxios.get).toHaveBeenCalledWith("/riddles/4");
      expect(result).toEqual<Riddle>({ id: 4, question: "Q4?", answer: "A4", file: null });
    });

    it("logs and throws on error", async () => {
      const error = new Error("Fetch failed");
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getRiddleById(4)).rejects.toThrow("Fetch failed");
      expect(mockedLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to fetch single riddle"),
          component: "RiddlesAPI.ts",
        })
      );
    });
  });
});
