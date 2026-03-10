import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ManageQuestionsPage from "../src/views/admin/ManageQuestionsPage";
import { getQuestions } from "../src/api/QuestionsAPI";

jest.mock("../src/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

jest.mock("../src/api/QuestionsAPI", () => ({
  getQuestions: jest.fn(),
}));

jest.mock("../src/components/manageQuestions/ManageQuestionsDataTable", () => ({
  ManageQuestionsDataTable: ({ data, onDeleteQuestions }: any) => (
    <div>
      <div data-testid="manage-table">rows:{data.length}</div>
      <button onClick={() => onDeleteQuestions?.([1])}>simulate-delete</button>
    </div>
  ),
}));

const mockedGetQuestions = getQuestions as jest.MockedFunction<typeof getQuestions>;

describe("ManageQuestionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and renders data table", async () => {
    mockedGetQuestions.mockResolvedValueOnce([
      {
        id: 1,
        title: "Q1",
        description: "d",
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

    render(<ManageQuestionsPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("manage-table")).toHaveTextContent("rows:1");
    });
  });

  it("updates rows when onDeleteQuestions callback is triggered", async () => {
    mockedGetQuestions.mockResolvedValueOnce([
      {
        question_id: 1,
        question_name: "Q1",
        question_description: "d1",
        media: null,
        preset_code: "",
        template_solution: "",
        from_string_function: "",
        to_string_function: "",
        tags: [],
        testcases: [],
        difficulty: "Easy",
        created_at: new Date(),
        last_modified_at: new Date(),
      },
      {
        question_id: 2,
        question_name: "Q2",
        question_description: "d2",
        media: null,
        preset_code: "",
        template_solution: "",
        from_string_function: "",
        to_string_function: "",
        tags: [],
        testcases: [],
        difficulty: "Medium",
        created_at: new Date(),
        last_modified_at: new Date(),
      },
    ] as any);

    render(<ManageQuestionsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("manage-table")).toHaveTextContent("rows:2");
    });

    screen.getByRole("button", { name: "simulate-delete" }).click();

    await waitFor(() => {
      expect(screen.getByTestId("manage-table")).toHaveTextContent("rows:1");
    });
  });

  it("renders error when fetch fails", async () => {
    mockedGetQuestions.mockRejectedValueOnce(new Error("fetch failed"));

    render(<ManageQuestionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: fetch failed")).toBeInTheDocument();
    });
  });
});
