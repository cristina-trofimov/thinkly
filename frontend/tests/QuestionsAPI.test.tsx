import axiosClient from "../src/lib/axiosClient";
import {
  getQuestions,
  getRiddles,
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
