import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ✅ change this import to your real page path
import ManageRiddles from "../src/views/admin/ManageRiddlePage";

// ---- Mocks ----
jest.mock("@/api/RiddlesAPI", () => ({
    getRiddles: jest.fn(),
    deleteRiddle: jest.fn(),
}));

jest.mock("../src/api/LoggerAPI", () => ({
    logFrontend: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

/**
 * Mock the reusable form component so we can “trigger” success without testing its internals.
 */
jest.mock("@/components/forms/FileUpload", () => ({
    __esModule: true,
    default: ({ mode, onSuccess }: any) => (
        <div>
            <div data-testid="riddle-form-mode">{mode}</div>
            <button onClick={onSuccess} data-testid={`riddle-form-success-${mode}`}>
                simulate-{mode}-success
            </button>
        </div>
    ),
}));

/**
 * shadcn Dialog renders via portals; mock to simple conditional rendering for stable tests.
 */
jest.mock("@/components/ui/dialog", () => {
    const React = require("react");
    return {
        Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : <div>{children}</div>),
        DialogTrigger: ({ children }: any) => <>{children}</>,
        DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
        DialogHeader: ({ children }: any) => <div>{children}</div>,
        DialogTitle: ({ children }: any) => <div>{children}</div>,
        DialogFooter: ({ children }: any) => <div>{children}</div>,
    };
});

import { getRiddles, deleteRiddle } from "@/api/RiddlesAPI";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";

const sampleRiddles = [
    { id: 1, question: "Alpha question", answer: "First", file: null },
    { id: 2, question: "Bravo", answer: "Second", file: "https://example.com/file.pdf" },
];

beforeEach(() => {
    jest.clearAllMocks();
    // ✅ don't redefine location; just set path
    window.history.pushState({}, "Test", "/test");
});

describe("ManageRiddles", () => {
    test("loads riddles on mount and renders cards", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles);

        render(<ManageRiddles />);

        expect(screen.getByText(/Manage Riddles/i)).toBeInTheDocument();

        expect(await screen.findByText("Alpha question")).toBeInTheDocument();
        expect(screen.getByText("Bravo")).toBeInTheDocument();

        // attachment badge + link for file
        expect(screen.getByText(/Has Media/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /View Attachment/i })).toHaveAttribute(
            "href",
            "https://example.com/file.pdf"
        );

        expect(getRiddles).toHaveBeenCalledTimes(1);
    });

    test("shows loading state when loading and no riddles yet", async () => {
        let resolveFn: (v: any) => void = () => {};
        (getRiddles as jest.Mock).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFn = resolve;
                })
        );

        render(<ManageRiddles />);

        expect(screen.getByText(/Loading riddles/i)).toBeInTheDocument();

        resolveFn([]);
        await waitFor(() => expect(getRiddles).toHaveBeenCalled());
    });

    test("search filters by question or answer", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles);
        render(<ManageRiddles />);

        await screen.findByText("Alpha question");
        const input = screen.getByPlaceholderText(/Search question or answer/i);

        fireEvent.change(input, { target: { value: "alpha" } });
        expect(screen.getByText("Alpha question")).toBeInTheDocument();
        expect(screen.queryByText("Bravo")).not.toBeInTheDocument();

        fireEvent.change(input, { target: { value: "second" } });
        expect(screen.getByText("Bravo")).toBeInTheDocument();
        expect(screen.queryByText("Alpha question")).not.toBeInTheDocument();
    });

    test("logs + toast error when getRiddles fails", async () => {
        (getRiddles as jest.Mock).mockRejectedValueOnce(new Error("boom"));

        render(<ManageRiddles />);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load riddles"));
        expect(logFrontend).toHaveBeenCalled();

        const logArg = (logFrontend as jest.Mock).mock.calls[0][0];
        expect(logArg.level).toBe("ERROR");
        expect(logArg.component).toBe("ManageRiddlesPage.tsx");
        expect(typeof logArg.url).toBe("string");
    });

});
