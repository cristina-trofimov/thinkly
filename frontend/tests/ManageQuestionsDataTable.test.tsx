import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ManageQuestionsDataTable } from "../src/components/manageQuestions/ManageQuestionsDataTable";
import { columns } from "../src/components/manageQuestions/ManageQuestionsColumns";
import type { Question } from "../src/types/questions/Question.type";
import { deleteQuestion, deleteQuestions } from "../src/api/QuestionsAPI";
import { toast } from "sonner";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "http://localhost:8000",
  parseAxiosErrorMessage: jest.fn(() => "boom"),
}));

jest.mock("../src/api/QuestionsAPI", () => ({
  deleteQuestion: jest.fn(),
  deleteQuestions: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../src/components/manageQuestions/UploadQuestionsJSONButton", () => ({
  __esModule: true,
  default: ({ children, onSuccess, onFailure }: any) => (
    <button
      data-testid="upload-json"
      onClick={() => {
        onSuccess?.();
        onFailure?.("boom");
      }}
    >
      {children}
    </button>
  ),
}));

jest.mock("../src/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

const mockedDeleteQuestions = deleteQuestions as jest.MockedFunction<typeof deleteQuestions>;
const mockedDeleteQuestion = deleteQuestion as jest.MockedFunction<typeof deleteQuestion>;
const mockedToast = toast as jest.Mocked<typeof toast>;

const data: Question[] = [
  {
    question_id: 1,
    question_name: "Two Sum",
    question_description: "Add two nums",
    media: null,
    language_specific_properties: [],
    tags: [],
    testcases: [],
    difficulty: "Easy",
    created_at: new Date("2025-01-01"),
    last_modified_at: new Date("2025-01-01"),
  },
  {
    question_id: 2,
    question_name: "Reverse List",
    question_description: "Reverse",
    media: null,
    language_specific_properties: [],
    tags: [],
    testcases: [],
    difficulty: "Hard",
    created_at: new Date("2025-01-02"),
    last_modified_at: new Date("2025-01-02"),
  },
];

describe("ManageQuestionsDataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders and filters rows by title", async () => {
    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={data} />
      </MemoryRouter>
    );

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Filter question titles..."), {
      target: { value: "Reverse" },
    });

    await waitFor(() => {
      expect(screen.getByText("Reverse List")).toBeInTheDocument();
      expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    });
  });

  it("deletes selected rows and calls callback", async () => {
    mockedDeleteQuestions.mockResolvedValueOnce({
      status_code: 200,
      deleted_count: 1,
      deleted_questions: [{ question_id: 1 }],
      total_requested: 1,
      errors: [],
    } as any);

    const onDeleteQuestions = jest.fn();
    render(
      <MemoryRouter>
        <ManageQuestionsDataTable
          columns={columns as any}
          data={data}
          onDeleteQuestions={onDeleteQuestions}
        />
      </MemoryRouter>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockedDeleteQuestions).toHaveBeenCalledWith([1]);
      expect(onDeleteQuestions).toHaveBeenCalledWith([1]);
      expect(mockedToast.success).toHaveBeenCalled();
    });
  });

  it("handles partial success for batch delete", async () => {
    mockedDeleteQuestions.mockResolvedValueOnce({
      status_code: 200,
      deleted_count: 1,
      deleted_questions: [{ question_id: 1 }],
      total_requested: 2,
      errors: [{ question_id: 2, error: "Question not found." }],
    } as any);

    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={data} onDeleteQuestions={jest.fn()} />
      </MemoryRouter>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith(
        "Deleted 1/2 questions successfully."
      );
      expect(mockedToast.warning).toHaveBeenCalledWith(
        "1 questions could not be deleted."
      );
    });
  });

  it("shows default batch delete error when backend detail is absent", async () => {
    mockedDeleteQuestions.mockRejectedValueOnce({ response: {} } as any);

    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={data} />
      </MemoryRouter>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        "Failed to delete selected question(s)."
      );
    });
  });

  it("deletes a single row from actions cell", async () => {
    const user = userEvent.setup();
    mockedDeleteQuestion.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={data} />
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole("button", { name: /open menu/i })[0]);
    await user.click(await screen.findByRole("menuitem", { name: /delete question/i }));

    await waitFor(() => {
      expect(mockedDeleteQuestion).toHaveBeenCalledWith(1);
      expect(mockedToast.success).toHaveBeenCalledWith("Question 1 deleted successfully!");
    });
  });

  it("shows parsed error when single row delete fails", async () => {
    const user = userEvent.setup();
    mockedDeleteQuestion.mockRejectedValueOnce(new Error("failed"));

    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={data} />
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole("button", { name: /open menu/i })[0]);
    await user.click(await screen.findByRole("menuitem", { name: /delete question/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith("Failed to delete question 1: boom");
    });
  });

  it("applies difficulty filters from dropdown options", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={data} />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /all difficulties/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Easy" }));

    await user.click(screen.getByRole("button", { name: /easy/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Medium" }));

    await user.click(screen.getByRole("button", { name: /medium/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Hard" }));

    await user.click(screen.getByRole("button", { name: /hard/i }));
    await user.click(await screen.findByRole("menuitem", { name: "All" }));

    expect(screen.getByRole("button", { name: /all difficulties/i })).toBeInTheDocument();
  });

  it("navigates between pages", async () => {
    const manyRows = Array.from({ length: 12 }, (_, idx) => ({
      ...data[0],
      question_id: idx + 1,
      question_name: `Question ${idx + 1}`,
    }));

    render(
      <MemoryRouter>
        <ManageQuestionsDataTable columns={columns as any} data={manyRows as any} />
      </MemoryRouter>
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeEnabled();
    fireEvent.click(nextButton);

    const previousButton = screen.getByRole("button", { name: /previous/i });
    expect(previousButton).toBeEnabled();
    fireEvent.click(previousButton);
  });

  it("handles upload callbacks", () => {
    const onUploadQuestions = jest.fn();
    render(
      <MemoryRouter>
        <ManageQuestionsDataTable
          columns={columns as any}
          data={data}
          onUploadQuestions={onUploadQuestions}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId("upload-json"));

    expect(onUploadQuestions).toHaveBeenCalled();
    expect(mockedToast.success).toHaveBeenCalledWith("Questions uploaded successfully!");
    expect(mockedToast.error).toHaveBeenCalledWith("Questions failed to upload: boom");
  });
});
