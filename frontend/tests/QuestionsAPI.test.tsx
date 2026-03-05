import axiosClient from "../src/lib/axiosClient";
import {
  getQuestions,
  getQuestionsPage,
  getRiddles,
  deleteCompetition,
  getTestcases
} from "../src/api/QuestionsAPI";

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
const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

describe("QuestionsAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("getQuestions", () => {
    it("fetches and formats questions correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 1,
          page: 1,
          page_size: 100,
          items: [
            {
              question_id: 1,
              question_name: "What is 2+2?",
              question_description: "Add two numbers",
              media: null,
              preset_code: "",
              template_solution: "def solve(): pass",
              difficulty: "easy",
              last_modified_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      } as any);

      const result = await getQuestions();

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-questions", {
        params: { page: 1, page_size: 100, search: undefined, difficulty: undefined, sort: "asc" },
      });
      expect(result).toEqual([
        {
          id: 1,
          title: "What is 2+2?",
          description: "Add two numbers",
          media: "",
          preset_code: "",
          template_solution: "def solve(): pass",
          difficulty: "Easy",
          date: new Date("2025-01-01T00:00:00Z"),
        },
      ]);
    });

    it("fetches subsequent question pages when needed", async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            total: 101,
            page: 1,
            page_size: 100,
            items: [
              {
                question_id: 1,
                question_name: "Page One",
                question_description: "",
                media: null,
                preset_code: "",
                template_solution: "",
                difficulty: "easy",
                last_modified_at: "2025-01-01T00:00:00Z",
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            total: 101,
            page: 2,
            page_size: 100,
            items: [
              {
                question_id: 2,
                question_name: "Page Two",
                question_description: "",
                media: null,
                preset_code: "",
                template_solution: "",
                difficulty: "hard",
                last_modified_at: "2025-01-02T00:00:00Z",
              },
            ],
          },
        } as any);

      const result = await getQuestions();

      expect(mockedAxios.get).toHaveBeenNthCalledWith(2, "/questions/get-all-questions", {
        params: { page: 2, page_size: 100, search: undefined, difficulty: undefined, sort: "asc" },
      });
      expect(result).toHaveLength(2);
      expect(result[1].difficulty).toBe("Hard");
    });

    it("fetches a paginated questions slice", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 25,
          page: 2,
          page_size: 10,
          items: [
            {
              question_id: 11,
              question_name: "Sorted Question",
              question_description: "Page item",
              media: null,
              preset_code: "",
              template_solution: "",
              difficulty: "medium",
              last_modified_at: "2025-01-11T00:00:00Z",
            },
          ],
        },
      } as any);

      const result = await getQuestionsPage({
        page: 2,
        pageSize: 10,
        search: "sort",
        difficulty: "medium",
        sort: "desc",
      });

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-questions", {
        params: { page: 2, page_size: 10, search: "sort", difficulty: "medium", sort: "desc" },
      });
      expect(result).toEqual({
        total: 25,
        page: 2,
        pageSize: 10,
        items: [
          {
            id: 11,
            title: "Sorted Question",
            description: "Page item",
            media: "",
            preset_code: "",
            template_solution: "",
            difficulty: "Medium",
            date: new Date("2025-01-11T00:00:00Z"),
          },
        ],
      });
    });

    it("throws error if axios fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getQuestions()).rejects.toThrow("Network error");
    });
  });

  describe("getRiddles", () => {
    it("fetches and formats riddles correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          total: 1,
          page: 1,
          page_size: 100,
          items: [
            {
              riddle_id: 10,
              riddle_question: "What has keys but can't open locks?",
              riddle_answer: "Piano",
              riddle_file: null,
            },
          ],
        },
      } as any);

      const result = await getRiddles();

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-riddles", {
        params: { page: 1, page_size: 100 },
      });
      expect(result).toEqual([
        {
          id: 10,
          question: "What has keys but can't open locks?",
          answer: "Piano",
          file: null,
        },
      ]);
    });

    it("throws error if axios fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getRiddles()).rejects.toThrow("Network error");
    });
  });

  describe("deleteCompetition", () => {
    it("calls axios delete and logs success", async () => {
      mockedAxios.delete.mockResolvedValueOnce({} as any);

      await deleteCompetition("123");

      expect(mockedAxios.delete).toHaveBeenCalledWith("/competitions/delete-competition/123");
      expect(console.log).toHaveBeenCalledWith("Competition 123 deleted successfully");
    });

    it("throws error if axios delete fails", async () => {
      mockedAxios.delete.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(deleteCompetition("123")).rejects.toThrow("Delete failed");
      expect(console.error).toHaveBeenCalledWith("Error deleting competition:", expect.any(Error));
    });
  });

  describe("getTestcases", () => {
    it("fetches and formats testcases correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            test_case_id: 1,
            question_id: 1,
            input_data: '{ "a": [1, 2], "b": 6 }',
            expected_output: "",
          },
        ],
      } as any);

      const result = await getTestcases(1);

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-testcases/1");
      expect(result).toEqual([
        {
          test_case_id: 1,
          question_id: 1,
          input_data: { a: [1, 2], b: 6 },
          expected_output: "",
          caseID: "Case 1",
        },
      ]);
    });

    it("throws error if axios fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getTestcases(-1)).rejects.toThrow("Network error");
    });
  });
});
