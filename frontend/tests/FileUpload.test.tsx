// tests/FileUpload.test.tsx
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RiddleForm from "../src/components/forms/FileUpload";
import { toast } from "sonner";
import axios from "axios";
import { createRiddle, updateRiddle } from "../src/api/RiddlesAPI";
import { logFrontend } from "../src/api/LoggerAPI";

// -------------------- MOCKS --------------------

jest.mock("../src/api/RiddlesAPI", () => ({
  __esModule: true,
  createRiddle: jest.fn(),
  updateRiddle: jest.fn(),
}));

jest.mock("../src/api/LoggerAPI", () => ({
  __esModule: true,
  logFrontend: jest.fn(),
}));

jest.mock("sonner", () => {
  const toastFn: any = jest.fn();
  toastFn.error = jest.fn();
  toastFn.success = jest.fn();
  return { toast: toastFn };
});

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    isAxiosError: jest.fn(),
  },
}));

// Shadcn minimal mocks
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, ...props }: any) => <button {...props}>{children}</button>,
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));
jest.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

// Lucide icons mock
jest.mock("lucide-react", () => ({
  Trash2: () => <span>Trash2</span>,
  UploadCloud: () => <span>UploadCloud</span>,
  FileText: () => <span>FileText</span>,
  X: () => <span>X</span>,
}));

// -------------------- HELPERS --------------------

const mockCreateRiddle = createRiddle as jest.Mock;
const mockUpdateRiddle = updateRiddle as jest.Mock;
const mockToast = toast as any;
const mockAxiosIsAxiosError = (axios as any).isAxiosError as jest.Mock;
const mockLogFrontend = logFrontend as jest.Mock;

function fillRequiredFields(question = "Q?", answer = "A") {
  fireEvent.change(screen.getByPlaceholderText("e.g., What has keys but can't open locks?"), {
    target: { value: question },
  });
  fireEvent.change(screen.getByPlaceholderText("e.g., A piano"), {
    target: { value: answer },
  });
}

function makeFile(name: string, type: string, sizeBytes = 1000) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("#file-input") as HTMLInputElement | null;
  if (!input) throw new Error("file input (#file-input) not found");
  return input;
}

describe("RiddleForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).URL.createObjectURL = jest.fn(() => "blob:preview");
    (global as any).URL.revokeObjectURL = jest.fn();
  });

  describe("Create mode", () => {
    it("renders create title and submit button", () => {
      render(<RiddleForm mode="create" />);
      expect(screen.getByText("Create New Riddle")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Riddle" })).toBeInTheDocument();
    });

    it("validates required fields", () => {
      render(<RiddleForm mode="create" />);
      fireEvent.click(screen.getByRole("button", { name: "Create Riddle" }));
      expect(mockToast.error).toHaveBeenCalledWith("Question and Answer are required.");
      expect(mockCreateRiddle).not.toHaveBeenCalled();
    });

    it("creates riddle successfully and resets form + calls onSuccess", async () => {
      mockCreateRiddle.mockResolvedValueOnce({ id: 1, question: "Q1", answer: "A1", file: null });

      const onSuccess = jest.fn();
      render(<RiddleForm mode="create" onSuccess={onSuccess} />);

      fillRequiredFields("Q1", "A1");
      fireEvent.click(screen.getByRole("button", { name: "Create Riddle" }));

      await waitFor(() => expect(mockCreateRiddle).toHaveBeenCalledTimes(1));
      expect(mockToast.success).toHaveBeenCalledWith("Riddle created successfully!");
      expect(onSuccess).toHaveBeenCalledTimes(1);

      expect(
        (screen.getByPlaceholderText("e.g., What has keys but can't open locks?") as HTMLInputElement).value
      ).toBe("");
      expect((screen.getByPlaceholderText("e.g., A piano") as HTMLInputElement).value).toBe("");
    });

    it("rejects unsupported file type, logs + toast error", () => {
      const { container } = render(<RiddleForm mode="create" />);
      const input = getFileInput(container);

      const bad = makeFile("bad.txt", "text/plain", 1000);
      fireEvent.change(input, { target: { files: [bad] } });

      expect(mockLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Unsupported file type"),
          component: "RiddleForm.tsx",
        })
      );
      expect(mockToast.error).toHaveBeenCalledWith("Unsupported file type. Use image/audio/video/pdf.");
    });

    it("rejects file >100MB", () => {
      const { container } = render(<RiddleForm mode="create" />);
      const input = getFileInput(container);

      const huge = makeFile("huge.pdf", "application/pdf", 101 * 1024 * 1024);
      fireEvent.change(input, { target: { files: [huge] } });

      expect(mockToast.error).toHaveBeenCalledWith("File too large. Max 100MB.");
    });

    it("accepts a valid file and shows filename + type; can remove selected file", () => {
      const { container } = render(<RiddleForm mode="create" />);
      const input = getFileInput(container);

      const img = makeFile("pic.png", "image/png", 1000);
      fireEvent.change(input, { target: { files: [img] } });

      expect(screen.getByText("pic.png")).toBeInTheDocument();
      expect(screen.getByText("image/png")).toBeInTheDocument();
      expect((global as any).URL.createObjectURL).toHaveBeenCalled();

      // remove (trash icon button)
      fireEvent.click(screen.getByText("Trash2").closest("button")!);

      expect(screen.queryByText("pic.png")).not.toBeInTheDocument();
      expect((global as any).URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("shows axios error detail on create failure + logs", async () => {
      mockAxiosIsAxiosError.mockReturnValue(true);
      mockCreateRiddle.mockRejectedValueOnce({
        response: { data: { detail: "Backend says nope" } },
        message: "Axios message",
      });

      render(<RiddleForm mode="create" />);
      fillRequiredFields("Q", "A");

      fireEvent.click(screen.getByRole("button", { name: "Create Riddle" }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Backend says nope"));

      expect(mockLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to create riddle"),
          component: "RiddleForm.tsx",
        })
      );
    });

    it("shows generic error on non-axios create failure + logs", async () => {
      mockAxiosIsAxiosError.mockReturnValue(false);
      mockCreateRiddle.mockRejectedValueOnce(new Error("Boom"));

      render(<RiddleForm mode="create" />);
      fillRequiredFields("Q", "A");

      fireEvent.click(screen.getByRole("button", { name: "Create Riddle" }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Boom"));

      expect(mockLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to create riddle"),
          component: "RiddleForm.tsx",
        })
      );
    });
  });

  describe("Edit mode", () => {
    const initial = {
      id: 10,
      question: "Old Q",
      answer: "Old A",
      file: "http://example.com/old.pdf",
    };

    it("renders edit title + pre-fills fields + shows current attachment", () => {
      render(<RiddleForm mode="edit" initial={initial} />);

      expect(screen.getByText("Edit Riddle")).toBeInTheDocument();
      expect((screen.getByPlaceholderText("e.g., A piano") as HTMLInputElement).value).toBe("Old A");
      expect(screen.getByText(initial.file)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("toggle remove current attachment -> shows warning text and clears new selection", () => {
      const { container } = render(<RiddleForm mode="edit" initial={initial} />);

      // select replacement file
      const input = getFileInput(container);
      const img = makeFile("new.png", "image/png", 1000);
      fireEvent.change(input, { target: { files: [img] } });

      expect(screen.getByText("new.png")).toBeInTheDocument();

      // click remove current attachment (use title!)
      fireEvent.click(screen.getByTitle("Remove current attachment"));

      // should clear selected replacement
      expect(screen.queryByText("new.png")).not.toBeInTheDocument();

      // shows warning
      expect(screen.getByText("Attachment will be deleted when you save.")).toBeInTheDocument();
      // button label toggles to "Will remove"
      expect(screen.getByText("Will remove")).toBeInTheDocument();
    });

    it("updates riddle successfully (no remove, no new file)", async () => {
      mockUpdateRiddle.mockResolvedValueOnce({
        id: initial.id,
        question: "New Q",
        answer: "New A",
        file: initial.file,
      });

      const onSuccess = jest.fn();
      render(<RiddleForm mode="edit" initial={initial} onSuccess={onSuccess} />);

      fillRequiredFields("New Q", "New A");
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(mockUpdateRiddle).toHaveBeenCalledTimes(1));
      expect(mockUpdateRiddle).toHaveBeenCalledWith(
        expect.objectContaining({
          riddleId: 10,
          question: "New Q",
          answer: "New A",
          removeFile: false,
          file: null,
        })
      );

      expect(mockToast.success).toHaveBeenCalledWith("Riddle updated successfully!");
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("updates riddle with removeFile=true when removing existing attachment", async () => {
      mockUpdateRiddle.mockResolvedValueOnce({
        id: initial.id,
        question: initial.question,
        answer: initial.answer,
        file: null,
      });

      render(<RiddleForm mode="edit" initial={initial} />);

      // Toggle remove existing (title is stable)
      fireEvent.click(screen.getByTitle("Remove current attachment"));
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(mockUpdateRiddle).toHaveBeenCalledTimes(1));
      expect(mockUpdateRiddle).toHaveBeenCalledWith(
        expect.objectContaining({
          riddleId: 10,
          removeFile: true,
        })
      );
    });

    it("updates riddle with replacement file (removeFile should be false)", async () => {
      mockUpdateRiddle.mockResolvedValueOnce({
        id: initial.id,
        question: initial.question,
        answer: initial.answer,
        file: "http://example.com/new.png",
      });

      const { container } = render(<RiddleForm mode="edit" initial={initial} />);

      const input = getFileInput(container);
      const img = makeFile("new.png", "image/png", 1000);
      fireEvent.change(input, { target: { files: [img] } });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(mockUpdateRiddle).toHaveBeenCalledTimes(1));
      expect(mockUpdateRiddle).toHaveBeenCalledWith(
        expect.objectContaining({
          riddleId: 10,
          file: img,
          removeFile: false,
        })
      );
    });

    it("shows axios error detail on update failure + logs", async () => {
      mockAxiosIsAxiosError.mockReturnValue(true);
      mockUpdateRiddle.mockRejectedValueOnce({
        response: { data: { detail: "Update failed" } },
        message: "Axios msg",
      });

      render(<RiddleForm mode="edit" initial={initial} />);

      // Ensure it reaches API call (required fields already filled by initial, but still set to be safe)
      fillRequiredFields("Old Q", "Old A");

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Update failed"));

      expect(mockLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          message: expect.stringContaining("Failed to update riddle"),
          component: "RiddleForm.tsx",
        })
      );
    });
  });
});
