import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManageQuestionsPage from "../src/views/admin/ManageQuestionsPage";
import { getQuestionsPage } from "../src/api/QuestionsAPI";

jest.mock("../src/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

jest.mock("../src/api/QuestionsAPI", () => ({
  getQuestionsPage: jest.fn(),
}));

jest.mock("../src/components/manageQuestions/ManageQuestionsDataTable", () => ({
  ManageQuestionsDataTable: ({ data, loading, refreshTable }: any) => (
    <div>
      <div data-testid="manage-table">rows:{data.length}</div>
      <div data-testid="manage-table-loading">{String(Boolean(loading))}</div>
      <button onClick={() => refreshTable?.()}>simulate-refresh</button>
    </div>
  ),
}));

const mockedGetQuestionsPage = getQuestionsPage as jest.MockedFunction<typeof getQuestionsPage>;

describe("ManageQuestionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and renders data table", async () => {
    mockedGetQuestionsPage.mockResolvedValueOnce({
      items: [
        {
          question_id: 1,
          question_name: "Q1",
          question_description: "d",
          media: null,
          preset_functions: "",
          template_code: "",
          from_string_function: "",
          to_string_function: "",
          tags: [],
          testcases: [],
          difficulty: "Easy",
          created_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
          show_on_frontpage: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    } as any);

    render(<ManageQuestionsPage />);

    expect(screen.getByTestId("manage-table-loading")).toHaveTextContent("true");

    await waitFor(() => {
      expect(screen.getByTestId("manage-table")).toHaveTextContent("rows:1");
    });

    expect(screen.getByTestId("manage-table-loading")).toHaveTextContent("false");
    expect(mockedGetQuestionsPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      search: "",
      difficulty: undefined,
    });
  });

  it("updates rows when refreshTable callback is triggered", async () => {
    mockedGetQuestionsPage
      .mockResolvedValueOnce({
        items: [
          {
            question_id: 1,
            question_name: "Q1",
            question_description: "d1",
            media: null,
            preset_functions: "",
            template_code: "",
            from_string_function: "",
            to_string_function: "",
            tags: [],
            testcases: [],
            difficulty: "Easy",
            created_at: new Date().toISOString(),
            last_modified_at: new Date().toISOString(),
            show_on_frontpage: false,
          },
          {
            question_id: 2,
            question_name: "Q2",
            question_description: "d2",
            media: null,
            preset_functions: "",
            template_code: "",
            from_string_function: "",
            to_string_function: "",
            tags: [],
            testcases: [],
            difficulty: "Medium",
            created_at: new Date().toISOString(),
            last_modified_at: new Date().toISOString(),
            show_on_frontpage: false,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 25,
      } as any)
      .mockResolvedValueOnce({
        items: [
          {
            question_id: 1,
            question_name: "Q1",
            question_description: "d1",
            media: null,
            preset_functions: "",
            template_code: "",
            from_string_function: "",
            to_string_function: "",
            tags: [],
            testcases: [],
            difficulty: "Easy",
            created_at: new Date().toISOString(),
            last_modified_at: new Date().toISOString(),
            show_on_frontpage: false,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      } as any);

    render(<ManageQuestionsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("manage-table")).toHaveTextContent("rows:2");
    });

    fireEvent.click(screen.getByRole("button", { name: "simulate-refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("manage-table")).toHaveTextContent("rows:1");
    });

    expect(mockedGetQuestionsPage).toHaveBeenCalledTimes(2);
  });

  it("renders error when fetch fails", async () => {
    mockedGetQuestionsPage.mockRejectedValueOnce(new Error("fetch failed"));

    render(<ManageQuestionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: fetch failed")).toBeInTheDocument();
    });
  });
});
