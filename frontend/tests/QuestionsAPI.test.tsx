import axiosClient from "../src/lib/axiosClient";
import {
  getQuestionByID,
  getQuestions,
  getRiddles,
  deleteCompetition,
  getTestcases,
  deleteQuestions,
  deleteQuestion,
  uploadQuestions,
  updateQuestion,
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
        data: [
          {
            question_id: 1,
            question_name: "What is 2+2?",
            question_description: "Calculate the sum of 2 and 2.",
            media: null,
            difficulty: "Easy",
            testcases: [],
            to_string_function: "def to_string(): pass",
            from_string_function: "def from_string(): pass",
            preset_code: "class X:\n    pass",
            template_solution: "def solution(): pass",
            tags: ["math", "easy"],
            last_modified_at: "2025-01-01T00:00:00Z",
          },
        ],
      } as any);

      const result = await getQuestions();

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-questions");
      expect(result).toEqual([
        {
          id: 1,
          title: "What is 2+2?",
          description: "Calculate the sum of 2 and 2.",
          media: null,
          difficulty: "Easy",
          testcases: [],
          to_string_function: "def to_string(): pass",
          from_string_function: "def from_string(): pass",
          template_solution: "def solution(): pass",
          preset_code: "class X:\n    pass",
          tags: ["math", "easy"],
          date: new Date("2025-01-01T00:00:00Z"),
        },
      ]);
    });

    it("throws error if axios fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getQuestions()).rejects.toThrow("Network error");
    });
  });

  describe("getQuestionByID", () => {
    it("fetches and formats a single question", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          question_id: 7,
          question_name: "Single",
          question_description: "One question",
          media: null,
          preset_code: "",
          template_solution: "def solve(): pass",
          difficulty: "hard",
          last_modified_at: "2025-02-02T00:00:00Z",
          tags: ["graph"],
          from_string_function: "",
          to_string_function: "",
          testcases: [["1", "2"]],
        },
      } as any);

      const result = await getQuestionByID(7);

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-question-by-id/7");
      expect(result).toEqual({
        id: 7,
        title: "Single",
        description: "One question",
        media: null,
        preset_code: "",
        template_solution: "def solve(): pass",
        difficulty: "Hard",
        date: new Date("2025-02-02T00:00:00Z"),
        from_string_function: "",
        to_string_function: "",
        tags: ["graph"],
        testcases: [["1", "2"]],
      });
    });
  });

  describe("getRiddles", () => {
    it("fetches and formats riddles correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            riddle_id: 10,
            riddle_question: "What has keys but can't open locks?",
            riddle_answer: "Piano",
            riddle_file: null,
          },
        ],
      } as any);

      const result = await getRiddles();

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-riddles");
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

  describe("deleteQuestions and deleteQuestion", () => {
    it("deletes questions in batch and returns payload", async () => {
      mockedAxios.delete.mockResolvedValueOnce({
        data: {
          status_code: 200,
          deleted_count: 2,
          deleted_questions: [{ question_id: 1 }, { question_id: 2 }],
          total_requested: 2,
          errors: [],
        },
      } as any);

      const result = await deleteQuestions([1, 2]);

      expect(mockedAxios.delete).toHaveBeenCalledWith("/questions/batch-delete", {
        data: { question_ids: [1, 2] },
      });
      expect(result.deleted_count).toBe(2);
    });

    it("delegates single deletion to deleteQuestions", async () => {
      mockedAxios.delete.mockResolvedValueOnce({
        data: {
          status_code: 200,
          deleted_count: 1,
          deleted_questions: [{ question_id: 9 }],
          total_requested: 1,
          errors: [],
        },
      } as any);

      await deleteQuestion(9);

      expect(mockedAxios.delete).toHaveBeenCalledWith("/questions/batch-delete", {
        data: { question_ids: [9] },
      });
    });
  });

  describe("uploadQuestions", () => {
    it("uploads a question batch", async () => {
      mockedAxios.post.mockResolvedValueOnce({} as any);
      await uploadQuestions([
        {
          id: 1,
          title: "Q1",
          description: "D",
          media: null,
          preset_code: "",
          template_solution: "",
          from_string_function: "",
          to_string_function: "",
          tags: [],
          testcases: [],
          difficulty: "Easy",
          date: new Date(),
        },
      ] as any);

      expect(mockedAxios.post).toHaveBeenCalledWith("/questions/upload-question-batch", expect.any(Array));
    });
  });

  describe("updateQuestion", () => {
    it("calls update endpoint with editable fields", async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: {} } as any);

      await updateQuestion(5, {
        question_name: "Updated",
        question_description: "Updated desc",
        media: null,
        difficulty: "medium",
        preset_code: "",
        from_string_function: "",
        to_string_function: "",
        template_solution: "def solve(): pass",
        tags: ["tag"],
        testcases: [["in", "out"]],
      });

      expect(mockedAxios.put).toHaveBeenCalledWith("/questions/update-question/5", {
        question_name: "Updated",
        question_description: "Updated desc",
        media: null,
        difficulty: "medium",
        preset_code: "",
        from_string_function: "",
        to_string_function: "",
        template_solution: "def solve(): pass",
        tags: ["tag"],
        testcases: [["in", "out"]],
      });
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
