import axiosClient from "../src/lib/axiosClient";
import {
  getQuestionByID,
  getQuestions,
  getQuestionsPage,
  getTestCasesByQuestionId,
  ShowQuestionOnFrontpageByID,
  deleteCompetition,
  deleteQuestions,
} from "../src/api/QuestionsAPI";
import { logFrontend } from "../src/api/LoggerAPI";
import type { TagResponse, TestCase } from "../src/types/questions/QuestionPagination.type";

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
const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

jest.mock("../src/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));
const mockedLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeRawQuestion(overrides: Record<string, unknown> = {}) {
  return {
    question_id: 1,
    question_name: "Base Question",
    question_description: "Base description",
    media: null,
    difficulty: "easy",
    last_modified_at: "2025-01-01T00:00:00Z",
    show_on_frontpage: false,
    tags: [] as TagResponse[],
    test_cases: [] as TestCase[],
    language_specific_properties: [],
    ...overrides,
  };
}

function makeSinglePageResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      total: 1,
      page: 1,
      page_size: 100,
      items: [makeRawQuestion(overrides)],
    },
  };
}

// ---------------------------------------------------------------------------

describe("QuestionsAPI — additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  // -------------------------------------------------------------------------
  // normalizeDifficulty — all branches
  // -------------------------------------------------------------------------

  describe("normalizeDifficulty (via mapQuestion)", () => {
    it('normalises "medium" (mixed-case) to "Medium"', async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ difficulty: "MeDiUm" }) as any,
      );
      const [q] = await getQuestions();
      expect(q.difficulty).toBe("Medium");
    });

    it('normalises an unrecognised value to "Hard"', async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ difficulty: "HARD" }) as any,
      );
      const [q] = await getQuestions();
      expect(q.difficulty).toBe("Hard");
    });

    it('normalises "Easy" (already capitalised) to "Easy"', async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ difficulty: "Easy" }) as any,
      );
      const [q] = await getQuestions();
      expect(q.difficulty).toBe("Easy");
    });
  });

  // -------------------------------------------------------------------------
  // mapQuestion — field-level edge cases
  // -------------------------------------------------------------------------

  describe("mapQuestion field mapping", () => {
    it("uses created_at when present instead of last_modified_at", async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({
          created_at: "2024-06-15T00:00:00Z",
          last_modified_at: "2025-01-01T00:00:00Z",
        }) as any,
      );
      const [q] = await getQuestions();
      expect(q.created_at).toEqual(new Date("2024-06-15T00:00:00Z"));
      expect(q.last_modified_at).toEqual(new Date("2025-01-01T00:00:00Z"));
    });

    it("falls back to last_modified_at for created_at when created_at is absent", async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ last_modified_at: "2025-03-10T00:00:00Z" }) as any,
      );
      const [q] = await getQuestions();
      expect(q.created_at).toEqual(new Date("2025-03-10T00:00:00Z"));
    });

    it("preserves a non-null media value", async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ media: "https://example.com/image.png" }) as any,
      );
      const [q] = await getQuestions();
      expect(q.media).toBe("https://example.com/image.png");
    });

    it("maps show_on_frontpage: true correctly", async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ show_on_frontpage: true }) as any,
      );
      const [q] = await getQuestions();
      expect(q.show_on_frontpage).toBe(true);
    });

    it("coerces truthy show_on_frontpage integer (1) to true", async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({ show_on_frontpage: 1 }) as any,
      );
      const [q] = await getQuestions();
      expect(q.show_on_frontpage).toBe(true);
    });

    it("does NOT include collections (tags/test_cases) when includeCollections is false (list endpoint)", async () => {
      mockedAxios.get.mockResolvedValueOnce(
        makeSinglePageResponse({
          tags: [{ tag_id: 99, tag_name: "should-be-ignored" }],
          test_cases: [
            { test_case_id: 99, question_id: 1, input_data: "x", expected_output: "y" },
          ],
        }) as any,
      );
      const [q] = await getQuestions();
      // mapQuestion is called without includeCollections, so collections are empty arrays
      expect(q.tags).toEqual([]);
      expect(q.test_cases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getQuestionsPage — search trimming
  // -------------------------------------------------------------------------

  describe("getQuestionsPage", () => {
    it("trims whitespace from the search parameter", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 100, items: [] },
      } as any);

      await getQuestionsPage({ search: "  binary search  " });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/questions/get-all-questions",
        expect.objectContaining({
          params: expect.objectContaining({ search: "binary search" }),
        }),
      );
    });

    it("passes undefined for an empty search string", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 100, items: [] },
      } as any);

      await getQuestionsPage({ search: "   " });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/questions/get-all-questions",
        expect.objectContaining({
          params: expect.objectContaining({ search: undefined }),
        }),
      );
    });

    it("uses default parameters when called with no arguments", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 100, items: [] },
      } as any);

      await getQuestionsPage();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/questions/get-all-questions",
        expect.objectContaining({
          params: { page: 1, page_size: 100, search: undefined, difficulty: undefined, sort: "asc" },
        }),
      );
    });

    it("returns an empty items array when the server returns no items", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { total: 0, page: 1, page_size: 100, items: [] },
      } as any);

      const result = await getQuestionsPage();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getQuestions — error branch console.error
  // -------------------------------------------------------------------------

  describe("getQuestions — error logging", () => {
    it("logs the error to console.error before re-throwing", async () => {
      const networkError = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(getQuestions()).rejects.toThrow("Network error");
      expect(console.error).toHaveBeenCalledWith("Error fetching questions:", networkError);
    });
  });

  // -------------------------------------------------------------------------
  // getQuestionByID — error branch logFrontend
  // -------------------------------------------------------------------------

  describe("getQuestionByID — error logging", () => {
    it("calls logFrontend with ERROR level on fetch failure", async () => {
      const apiError = new Error("Server 500");
      mockedAxios.get.mockRejectedValueOnce(apiError);

      await expect(getQuestionByID(42)).rejects.toThrow("Server 500");

      expect(mockedLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "QuestionsAPI",
          message: expect.stringContaining("Server 500"),
        }),
      );
    });

    it("includes the error stack in the logFrontend call", async () => {
      const apiError = new Error("Stack test");
      mockedAxios.get.mockRejectedValueOnce(apiError);

      await expect(getQuestionByID(1)).rejects.toThrow();

      expect(mockedLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({ stack: apiError.stack }),
      );
    });

    it("maps null tags array gracefully", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ...makeRawQuestion({ question_id: 10, difficulty: "easy" }),
          tags: null,
          test_cases: null,
          language_specific_properties: null,
        },
      } as any);

      const result = await getQuestionByID(10);
      expect(result.tags).toEqual([]);
      expect(result.test_cases).toEqual([]);
      expect(result.language_specific_properties).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // ShowQuestionOnFrontpageByID
  // -------------------------------------------------------------------------

  describe("ShowQuestionOnFrontpageByID", () => {
    it("calls PUT with shouldShow: true and returns the response payload", async () => {
      mockedAxios.put.mockResolvedValueOnce({
        data: { question_id: 3, show_on_frontpage: true },
      } as any);

      const result = await ShowQuestionOnFrontpageByID(3, true);

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "/questions/show-question-on-frontpage-by-id/3",
        { should_show: true },
      );
      expect(result).toEqual({ question_id: 3, show_on_frontpage: true });
    });

    it("calls PUT with shouldShow: false", async () => {
      mockedAxios.put.mockResolvedValueOnce({
        data: { question_id: 5, show_on_frontpage: false },
      } as any);

      const result = await ShowQuestionOnFrontpageByID(5, false);

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "/questions/show-question-on-frontpage-by-id/5",
        { should_show: false },
      );
      expect(result.show_on_frontpage).toBe(false);
    });

    it("propagates axios errors without swallowing them", async () => {
      mockedAxios.put.mockRejectedValueOnce(new Error("PUT failed"));
      await expect(ShowQuestionOnFrontpageByID(1, true)).rejects.toThrow("PUT failed");
    });
  });

  // -------------------------------------------------------------------------
  // getTestCasesByQuestionId
  // -------------------------------------------------------------------------

  describe("getTestCasesByQuestionId", () => {
    const testCases: TestCase[] = [
      { test_case_id: 1, question_id: 7, input_data: "1", expected_output: "2" },
      { test_case_id: 2, question_id: 7, input_data: "3", expected_output: "6" },
    ];

    function mockGetQuestionByID() {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ...makeRawQuestion({ question_id: 7, difficulty: "medium" }),
          tags: [],
          test_cases: testCases,
          language_specific_properties: [],
        },
      } as any);
    }

    it("returns test_cases from the fetched question", async () => {
      mockGetQuestionByID();
      const result = await getTestCasesByQuestionId(7);
      expect(result).toEqual(testCases);
    });

    it("calls the correct endpoint for the given ID", async () => {
      mockGetQuestionByID();
      await getTestCasesByQuestionId(7);
      expect(mockedAxios.get).toHaveBeenCalledWith("/questions/get-question-by-id/7");
    });

    it("throws and calls logFrontend when questionId is undefined", async () => {
      await expect(getTestCasesByQuestionId(undefined)).rejects.toThrow(
        "Question ID is undefined",
      );
      expect(mockedLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("undefined"),
          component: "QuestionsAPI",
        }),
      );
    });

    it("re-throws and logs when the underlying getQuestionByID rejects", async () => {
      const fetchError = new Error("fetch failed");
      mockedAxios.get.mockRejectedValueOnce(fetchError);

      await expect(getTestCasesByQuestionId(99)).rejects.toThrow("fetch failed");
      expect(mockedLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "QuestionsAPI",
          message: expect.stringContaining("99"),
        }),
      );
    });

    it("returns an empty array when the question has no test cases", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ...makeRawQuestion({ question_id: 20, difficulty: "easy" }),
          tags: [],
          test_cases: [],
          language_specific_properties: [],
        },
      } as any);

      const result = await getTestCasesByQuestionId(20);
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // deleteCompetition — logFrontend void handling
  // -------------------------------------------------------------------------

  describe("deleteCompetition — logFrontend promise", () => {
    it("does not await logFrontend (fire-and-forget) so it resolves even if log rejects", async () => {
      mockedAxios.delete.mockResolvedValueOnce({} as any);
      // Use mockReturnValueOnce with a silenced rejection so the unhandled-rejection
      // handler never fires — mockRejectedValueOnce would crash the test runner because
      // the void-ed promise has no .catch() attached to it.
      const silentRejection = Promise.reject(new Error("log failed"));
      silentRejection.catch(() => {});
      mockedLogFrontend.mockReturnValueOnce(silentRejection as never);

      await expect(deleteCompetition("abc")).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // deleteQuestions — errors field in response
  // -------------------------------------------------------------------------

  describe("deleteQuestions — partial errors", () => {
    it("returns the errors array when some deletions fail", async () => {
      mockedAxios.delete.mockResolvedValueOnce({
        data: {
          status_code: 207,
          deleted_count: 1,
          deleted_questions: [{ question_id: 1 }],
          total_requested: 2,
          errors: [{ question_id: 2, error: "not found" }],
        },
      } as any);

      const result = await deleteQuestions([1, 2]);
      expect(result.errors).toEqual([{ question_id: 2, error: "not found" }]);
      expect(result.deleted_count).toBe(1);
    });
  });
});