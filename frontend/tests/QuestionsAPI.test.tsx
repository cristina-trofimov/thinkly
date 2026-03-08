import axiosClient from "../src/lib/axiosClient";
import {
  getQuestions,
  getQuestionByID,
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
            difficulty: "Easy",
            last_modified_at: "2025-01-01T00:00:00Z",
          },
        ],
      } as any);

      await getQuestions();

      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-all-questions");
    });

    it("throws error if axios fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getQuestions()).rejects.toThrow("Network error");
    });
  })

  describe("getQuestionByID", () => {
    it("fetches question associated to an id", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          question_id: 1,
          question_name: "What is 2+2?",
          difficulty: "Easy",
          last_modified_at: "2025-01-01T00:00:00Z",
        },
      } as any);

      await getQuestionByID(1);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/questions/question", { params: { question_id: 1 } }
      );
    });

    it("handles error if getQuestionByID fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getQuestionByID(-1)).rejects.toThrow("Network error");
      expect(mockedAxios.get).toHaveBeenCalled()
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
