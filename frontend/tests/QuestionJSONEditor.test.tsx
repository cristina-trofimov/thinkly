import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuestionJSONEditor from "../src/components/manageQuestions/QuestionJSONEditor";
import { getQuestionByID, updateQuestion } from "../src/api/QuestionsAPI";
import { parseAxiosErrorMessage } from "../src/lib/axiosClient";
import { toast } from "sonner";
import { TagResponse, TestCase } from "../src/types/questions/QuestionPagination.type";

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "http://localhost:8000",
  parseAxiosErrorMessage: jest.fn(() => "request failed"),
}));

const mockNavigate = jest.fn();
let mockedQuestionId = "9";

jest.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      data-testid="json-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("../src/api/QuestionsAPI", () => ({
  getQuestionByID: jest.fn(),
  updateQuestion: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ questionId: mockedQuestionId }),
  useNavigate: () => mockNavigate,
}));

const mockedGetQuestionByID = getQuestionByID as jest.MockedFunction<typeof getQuestionByID>;
const mockedUpdateQuestion = updateQuestion as jest.MockedFunction<typeof updateQuestion>;
const mockedParseAxiosErrorMessage = parseAxiosErrorMessage as jest.MockedFunction<
  typeof parseAxiosErrorMessage
>;
const mockedToast = toast as jest.Mocked<typeof toast>;

const baseQuestion = {
  question_id: 9,
  question_name: "Q",
  question_description: "Desc",
  media: null,
  language_specific_properties: [],
  tags: [] as TagResponse[],
  test_cases: [] as TestCase[],
  difficulty: "Easy" as const,
  created_at: new Date("2025-01-01"),
  last_modified_at: new Date("2025-01-01"),
};

const baseEditablePayload = {
  question_name: "Q2",
  question_description: "Desc2",
  media: null,
  difficulty: "easy",
  language_specific_properties: [],
  tags: [] as TagResponse[],
  test_cases: [{ input_data: "in", expected_output: "out" }],
};

describe("QuestionJSONEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuestionId = "9";
  });

  it("loads question payload and submits edited JSON", async () => {
    mockedGetQuestionByID.mockResolvedValueOnce({
      question_id: 9,
      question_name: "Q",
      question_description: "Desc",
      media: null,
      language_specific_properties: [],
      tags: [{ tag_id: 1, tag_name: "tag"}] as TagResponse[],
      test_cases: [{ test_case_id: 0, question_id: 9, input_data: "in", expected_output: "out" }],
      difficulty: "Easy",
      created_at: new Date("2025-01-01"),
      last_modified_at: new Date("2025-01-01"),
    });

    render(<QuestionJSONEditor />);

    await waitFor(() => {
      expect(mockedGetQuestionByID).toHaveBeenCalledWith(9);
    });

    const editor = screen.getByTestId("json-editor");
    const nextValue = JSON.stringify(
      {
        question_name: "Q2",
        question_description: "Desc2",
        media: null,
        difficulty: "easy",
        language_specific_properties: [],
        tags: [{ tag_id: 1, tag_name: "tag"}] as TagResponse[],
        test_cases: [{ test_case_id: 0, question_id: 9, input_data: "in", expected_output: "out" }],
      },
      null,
      2
    );
    fireEvent.change(editor, { target: { value: nextValue } });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mockedUpdateQuestion).toHaveBeenCalledWith(9, expect.objectContaining({ question_name: "Q2" }));
      expect(mockedToast.success).toHaveBeenCalled();
    });
  });

  // it("shows error when JSON is invalid", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce({
  //     question_id: 9,
  //     question_name: "Q",
  //     question_description: "Desc",
  //     media: null,
  //     language_specific_properties: [],
  //     tags: [] as TagResponse[],
  //     test_cases: [] as TestCase[],
  //     difficulty: "Easy",
  //     created_at: new Date("2025-01-01"),
  //     last_modified_at: new Date("2025-01-01"),
  //   });

  //   render(<QuestionJSONEditor />);

  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: { value: "{" },
  //   });

  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith("Invalid JSON format");
  //   });
  // });

  // it("shows invalid id payload and prevents submit when route param is invalid", async () => {
  //   mockedQuestionId = "abc";

  //   render(<QuestionJSONEditor />);

  //   await waitFor(() => {
  //     expect(screen.getByTestId("json-editor")).toHaveValue(
  //       JSON.stringify({ error: "Invalid question id" }, null, 2)
  //     );
  //   });

  //   expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  //   expect(mockedGetQuestionByID).not.toHaveBeenCalled();

  //   fireEvent.click(screen.getByRole("button", { name: /back/i }));
  //   expect(mockNavigate).toHaveBeenCalledWith("/app/dashboard/manageQuestions");
  // });

  // it("renders not found state when question lookup returns null", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(null as any);

  //   render(<QuestionJSONEditor />);

  //   await waitFor(() => {
  //     expect(screen.getByTestId("json-editor")).toHaveValue(
  //       JSON.stringify({ error: "Question 9 not found" }, null, 2)
  //     );
  //   });
  // });

  // it("renders fetch failure payload when loading question fails", async () => {
  //   mockedGetQuestionByID.mockRejectedValueOnce(new Error("network"));

  //   render(<QuestionJSONEditor />);

  //   await waitFor(() => {
  //     expect(screen.getByTestId("json-editor")).toHaveValue(
  //       JSON.stringify({ error: "Failed to fetch question" }, null, 2)
  //     );
  //   });
  // });

  // it("shows validation error when JSON shape is invalid", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);

  //   render(<QuestionJSONEditor />);

  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify({
  //         question_name: "Only one field",
  //       }),
  //     },
  //   });
  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith("Question_description must be a string");
  //   });
  // });

  // it("shows parsed API error when update fails with non-syntax error", async () => {
  //   mockedParseAxiosErrorMessage.mockReturnValueOnce("request failed");
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);
  //   mockedUpdateQuestion.mockRejectedValueOnce(new Error("server down"));

  //   render(<QuestionJSONEditor />);

  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify(
  //         {
  //           question_name: "Q2",
  //           question_description: "Desc2",
  //           media: null,
  //           difficulty: "easy",
  //           language_specific_properties: [],
  //           tags: [],
  //           test_cases: [{ input_data: "in", expected_output: "out" }],
  //         },
  //         null,
  //         2
  //       ),
  //     },
  //   });

  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith(
  //       "Failed to update question 9: request failed"
  //     );
  //   });
  // });

  // it("submits on Ctrl+S when form has unsaved changes", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce({
  //     question_id: 9,
  //     question_name: "Q",
  //     question_description: "Desc",
  //     media: null,
  //     language_specific_properties: [],
  //     tags: [],
  //     test_cases: [{ test_case_id: 0, question_id: 9, input_data: "in", expected_output: "out" }],
  //     difficulty: "Easy",
  //     created_at: new Date("2025-01-01"),
  //     last_modified_at: new Date("2025-01-01"),
  //   });

  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify(
  //         {
  //           question_name: "Q2",
  //           question_description: "Desc2",
  //           media: null,
  //           difficulty: "easy",
  //           language_specific_properties: [],
  //           tags: [],
  //           test_cases: [{ input_data: "in", expected_output: "out" }],
  //         },
  //         null,
  //         2
  //       ),
  //     },
  //   });

  //   fireEvent.keyDown(window, { key: "s", ctrlKey: true });

  //   await waitFor(() => {
  //     expect(mockedUpdateQuestion).toHaveBeenCalledTimes(1);
  //   });
  // });

  // it("opens discard dialog on back with unsaved changes and navigates on discard", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce({
  //     question_id: 9,
  //     question_name: "Q",
  //     question_description: "Desc",
  //     media: null,
  //     language_specific_properties: [],
  //     tags: [],
  //     test_cases: [{ test_case_id: 0, question_id: 9, input_data: "in", expected_output: "out" }],
  //     difficulty: "Easy",
  //     created_at: new Date("2025-01-01"),
  //     last_modified_at: new Date("2025-01-01"),
  //   });

  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify(
  //         {
  //           question_name: "Q2",
  //           question_description: "Desc2",
  //           media: null,
  //           difficulty: "easy",
  //           language_specific_properties: [],
  //           tags: [] as TagResponse[],
  //           test_cases: [{ input_data: "in", expected_output: "out" }],
  //         },
  //         null,
  //         2
  //       ),
  //     },
  //   });

  //   fireEvent.click(screen.getByRole("button", { name: /back/i }));
  //   expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();

  //   fireEvent.click(screen.getByRole("button", { name: /discard and go back/i }));
  //   expect(mockNavigate).toHaveBeenCalledWith("/app/dashboard/manageQuestions");
  // });

  // it("shows validation error when payload is not an object", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);
  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: { value: JSON.stringify([1, 2, 3]) },
  //   });
  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith("Question payload must be a JSON object");
  //   });
  // });

  // it("shows validation error for invalid difficulty", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);
  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: { value: JSON.stringify({ ...baseEditablePayload, difficulty: "legendary" }) },
  //   });
  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith("Difficulty must be one of: easy, medium, hard");
  //   });
  // });

  // it("shows validation error for invalid language_specific_properties entry", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);
  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify({
  //         ...baseEditablePayload,
  //         language_specific_properties: [{ language_name: "Python" }],
  //       }),
  //     },
  //   });
  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith(
  //       "Each language_specific_properties entry must include language_name, preset_code, template_solution, from_json_function, and to_json_function as strings"
  //     );
  //   });
  // });

  // it("shows validation error for testcase missing required keys", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);
  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify({
  //         ...baseEditablePayload,
  //         test_cases: [{ input_data: "in" }],
  //       }),
  //     },
  //   });
  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith("Each testcase must include input_data and expected_output");
  //   });
  // });

  // it("shows validation error when media is not string or null", async () => {
  //   mockedGetQuestionByID.mockResolvedValueOnce(baseQuestion);
  //   render(<QuestionJSONEditor />);
  //   await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

  //   fireEvent.change(screen.getByTestId("json-editor"), {
  //     target: {
  //       value: JSON.stringify({
  //         ...baseEditablePayload,
  //         media: 123,
  //       }),
  //     },
  //   });
  //   fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  //   await waitFor(() => {
  //     expect(mockedToast.error).toHaveBeenCalledWith("Media must be a string or null");
  //   });
  // });
});
