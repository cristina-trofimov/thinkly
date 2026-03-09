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

Object.defineProperty(Blob.prototype, "text", {
  configurable: true,
  writable: true,
  value: jest.fn(async function (this: Blob) {
    return Promise.resolve("[]");
  }),
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

  it("opens file picker when button is clicked", () => {
    const clickSpy = jest
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <UploadQuestionsJSONButton>Upload JSON</UploadQuestionsJSONButton>
    );

    fireEvent.click(screen.getByRole("button", { name: "Upload JSON" }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
