import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UploadQuestionsJSONButton from "../src/components/manageQuestions/UploadQuestionsJSONButton";
import { uploadQuestions } from "../src/api/QuestionsAPI";

jest.mock("../src/lib/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "http://localhost:8000",
  parseAxiosErrorMessage: jest.fn(() => "bad upload"),
}));

jest.mock("../src/api/QuestionsAPI", () => ({
  uploadQuestions: jest.fn(),
}));

const mockedUploadQuestions = uploadQuestions as jest.MockedFunction<typeof uploadQuestions>;

class MockFileReader {
  public onload: ((event: { target: { result: string } }) => void) | null = null;
  readAsText() {
    if (this.onload) {
      this.onload({
        target: {
          result: JSON.stringify([{ question_name: "q" }]),
        },
      });
    }
  }
}

Object.defineProperty(global, "FileReader", {
  writable: true,
  value: MockFileReader,
});

describe("UploadQuestionsJSONButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads parsed JSON and calls onSuccess", async () => {
    mockedUploadQuestions.mockResolvedValueOnce(undefined);
    const onSuccess = jest.fn();

    render(
      <UploadQuestionsJSONButton onSuccess={onSuccess}>Upload JSON</UploadQuestionsJSONButton>
    );

    const input = screen.getByRole("button", { name: "Upload JSON" }).parentElement?.querySelector("input") as HTMLInputElement;
    const file = new File(["[]"], "questions.json", { type: "application/json" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockedUploadQuestions).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls onFailure when upload fails", async () => {
    mockedUploadQuestions.mockRejectedValueOnce(new Error("bad upload"));
    const onFailure = jest.fn();

    render(
      <UploadQuestionsJSONButton onFailure={onFailure}>Upload JSON</UploadQuestionsJSONButton>
    );

    const input = screen.getByRole("button", { name: "Upload JSON" }).parentElement?.querySelector("input") as HTMLInputElement;
    const file = new File(["[]"], "questions.json", { type: "application/json" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onFailure).toHaveBeenCalled();
    });
  });
});
