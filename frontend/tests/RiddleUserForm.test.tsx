// tests/RiddleUserForm.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RiddleUserForm from "@/components/forms/RiddleForm";
import { toast } from "sonner";
import type { Riddle } from "@/types/riddle/Riddle.type";

// 1) Mock Toast (sonner)
jest.mock("sonner", () => {
    const toastFn: any = jest.fn();
    toastFn.error = jest.fn();
    toastFn.success = jest.fn();
    return { toast: toastFn };
});

// 2) Mock UI components (Shadcn)
jest.mock("@/components/ui/card", () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
}));

jest.mock("@/components/ui/button", () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/input", () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock("@/components/ui/separator", () => ({
    Separator: () => <hr data-testid="separator" />,
}));

// 3) Mock Icons
jest.mock("lucide-react", () => ({
    HelpCircle: () => <span data-testid="help-icon">?</span>,
    CheckCircle2: () => <span data-testid="check-icon">✓</span>,
}));

describe("RiddleUserForm", () => {
    const mockOnSolved = jest.fn();

    const mockRiddle: Riddle = {
        id: 1,
        question: "What has keys but no locks?",
        answer: "A piano",
        file: null, // Test without file first
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Initial Render", () => {
        it("renders the question and input field", () => {
            render(<RiddleUserForm riddle={mockRiddle} />);

            expect(screen.getByText("Riddle #1")).toBeInTheDocument();
            expect(screen.getByText("What has keys but no locks?")).toBeInTheDocument();
            expect(screen.getByLabelText("Your Answer")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /submit answer/i })).toBeInTheDocument();
        });

        it("does not render attachment section if no file is provided", () => {
            render(<RiddleUserForm riddle={mockRiddle} />);

            expect(screen.queryByText("Clue / Attachment")).not.toBeInTheDocument();
        });
    });

    describe("Form Submission & Validation", () => {
        it("shows an error toast if submitted empty", () => {
            render(<RiddleUserForm riddle={mockRiddle} />);

            const submitButton = screen.getByRole("button", { name: /submit answer/i });
            fireEvent.click(submitButton);

            expect(toast.error).toHaveBeenCalledWith("Please enter an answer!");
            expect(mockOnSolved).not.toHaveBeenCalled();
        });

        it("shows an error toast and clears input if answer is wrong", () => {
            render(<RiddleUserForm riddle={mockRiddle} />);

            const input = screen.getByLabelText("Your Answer");
            fireEvent.change(input, { target: { value: "A door" } });

            const submitButton = screen.getByRole("button", { name: /submit answer/i });
            fireEvent.click(submitButton);

            expect(toast.error).toHaveBeenCalledWith("Wrong answer, try again!");
            expect(input).toHaveValue(""); // Should clear input
            expect(mockOnSolved).not.toHaveBeenCalled();
        });

        it("shows a success toast, locks input, and calls onSolved if answer is correct (exact match)", () => {
            render(<RiddleUserForm riddle={mockRiddle} onSolved={mockOnSolved} />);

            const input = screen.getByLabelText("Your Answer");
            fireEvent.change(input, { target: { value: "A piano" } });

            const submitButton = screen.getByRole("button", { name: /submit answer/i });
            fireEvent.click(submitButton);

            expect(toast.success).toHaveBeenCalledWith("Correct! Great job.");
            expect(mockOnSolved).toHaveBeenCalledTimes(1);

            // Verify UI changes to solved state
            expect(screen.getByText("Riddle Solved!")).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: /submit answer/i })).not.toBeInTheDocument();
            expect(input).toBeDisabled();
        });

        it("accepts correct answer ignoring case and spaces", () => {
            render(<RiddleUserForm riddle={mockRiddle} onSolved={mockOnSolved} />);

            const input = screen.getByLabelText("Your Answer");
            // Answer is "A piano", testing lowercase with extra spaces
            fireEvent.change(input, { target: { value: "  a   piano  " } });

            const submitButton = screen.getByRole("button", { name: /submit answer/i });
            fireEvent.click(submitButton);

            expect(toast.success).toHaveBeenCalledWith("Correct! Great job.");
            expect(mockOnSolved).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attachment Rendering", () => {
        it("renders a video tag for video extensions", () => {
            const riddleWithVideo = { ...mockRiddle, file: "http://example.com/clue.mp4" };
            render(<RiddleUserForm riddle={riddleWithVideo} />);

            expect(screen.getByText("Clue / Attachment")).toBeInTheDocument();
            // Checking if the fallback text inside <video> is rendered
            expect(screen.getByText(/browser does not support the video tag/i)).toBeInTheDocument();
        });

        it("renders an audio tag for audio extensions", () => {
            const riddleWithAudio = { ...mockRiddle, file: "http://example.com/sound.mp3" };
            render(<RiddleUserForm riddle={riddleWithAudio} />);

            expect(screen.getByText("Clue / Attachment")).toBeInTheDocument();
            expect(screen.getByText(/browser does not support the audio element/i)).toBeInTheDocument();
        });

        it("renders an iframe for PDF extensions", () => {
            const riddleWithPdf = { ...mockRiddle, file: "http://example.com/doc.pdf" };
            render(<RiddleUserForm riddle={riddleWithPdf} />);

            expect(screen.getByText("Clue / Attachment")).toBeInTheDocument();
            expect(screen.getByTitle("Riddle PDF Attachment")).toBeInTheDocument();
        });

        it("renders an img tag for unknown/image extensions", () => {
            const riddleWithImage = { ...mockRiddle, file: "http://example.com/pic.jpg" };
            render(<RiddleUserForm riddle={riddleWithImage} />);

            expect(screen.getByText("Clue / Attachment")).toBeInTheDocument();
            expect(screen.getByAltText("Riddle Attachment")).toBeInTheDocument();
        });

        it("strips query parameters when determining file type", () => {
            // URL ends with .pdf but has query params, should still render iframe
            const riddleWithPdfQuery = { ...mockRiddle, file: "http://example.com/doc.pdf?Signature=123" };
            render(<RiddleUserForm riddle={riddleWithPdfQuery} />);

            expect(screen.getByTitle("Riddle PDF Attachment")).toBeInTheDocument();
        });
    });
});