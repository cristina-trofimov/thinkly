import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuestionJSONEditor from "../src/components/manageQuestions/QuestionJSONEditor";
import { getQuestionByID, updateQuestion } from "../src/api/QuestionsAPI";
import { toast } from "sonner";

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
  useParams: () => ({ questionId: "9" }),
  useNavigate: () => mockNavigate,
}));

const mockedGetQuestionByID = getQuestionByID as jest.MockedFunction<typeof getQuestionByID>;
const mockedUpdateQuestion = updateQuestion as jest.MockedFunction<typeof updateQuestion>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe("QuestionJSONEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads question payload and submits edited JSON", async () => {
    mockedGetQuestionByID.mockResolvedValueOnce({
      id: 9,
      title: "Q",
      description: "Desc",
      media: null,
      preset_code: "",
      template_solution: "",
      from_string_function: "",
      to_string_function: "",
      tags: ["tag"],
      testcases: [["in", "out"]],
      difficulty: "Easy",
      date: new Date("2025-01-01"),
    } as any);

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
        preset_code: "",
        from_string_function: "",
        to_string_function: "",
        template_solution: "",
        tags: ["tag"],
        testcases: [["in", "out"]],
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

  it("shows error when JSON is invalid", async () => {
    mockedGetQuestionByID.mockResolvedValueOnce({
      id: 9,
      title: "Q",
      description: "Desc",
      media: null,
      preset_code: "",
      template_solution: "",
      from_string_function: "",
      to_string_function: "",
      tags: [],
      testcases: [],
      difficulty: "Easy",
      date: new Date("2025-01-01"),
    } as any);

    render(<QuestionJSONEditor />);

    await waitFor(() => expect(mockedGetQuestionByID).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId("json-editor"), {
      target: { value: "{" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith("Invalid JSON format");
    });
  });
});
