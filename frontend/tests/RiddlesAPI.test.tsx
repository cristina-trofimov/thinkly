import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";
import {
  getRiddles,
  createRiddle,
  deleteRiddle,
  getRiddleById,
  type CreateRiddleParams
} from "../src/api/RiddlesAPI";
import type { Riddle } from "../src/types/riddle/Riddle.type";

jest.mock("@/lib/axiosClient");
jest.mock("@/api/LoggerAPI");

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedLog = logFrontend as jest.MockedFunction<typeof logFrontend>;

describe("RiddlesAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRiddles", () => {
    it("fetches and formats riddles correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          { riddle_id: 1, riddle_question: "Q?", riddle_answer: "A", riddle_file: null },
        ],
      } as any);

      const result = await getRiddles();

      expect(mockedAxios.get).toHaveBeenCalledWith("/riddles/");
      expect(result).toEqual<Riddle[]>([
        { id: 1, question: "Q?", answer: "A", file: null },
      ]);
    });

    it("logs and throws on error", async () => {
      const error = new Error("Network failed");
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getRiddles()).rejects.toThrow("Network failed");
      expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({
        level: "ERROR",
        message: expect.stringContaining("Failed fetch riddles"),
      }));
    });
  });

  describe("createRiddle", () => {
    const params: CreateRiddleParams = { question: "Q2?", answer: "A2", file: null };

    it("creates and returns new riddle", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { riddle_id: 2, riddle_question: "Q2?", riddle_answer: "A2", riddle_file: null },
      } as any);

      const result = await createRiddle(params);

      expect(mockedAxios.post).toHaveBeenCalledWith("/riddles/create", params);
      expect(result).toEqual<Riddle>({ id: 2, question: "Q2?", answer: "A2", file: null });
    });

    it("logs and throws on error", async () => {
      const error = new Error("Create failed");
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(createRiddle(params)).rejects.toThrow("Create failed");
      expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({
        level: "ERROR",
        message: expect.stringContaining("Failed to create riddles"),
      }));
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
      expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({
        level: "ERROR",
        message: expect.stringContaining("Failed to delete riddles"),
      }));
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
      expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({
        level: "ERROR",
        message: expect.stringContaining("Failed to fetch single riddle"),
      }));
    });
  });
});
