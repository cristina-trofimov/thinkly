import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ✅ change this import to your real page path
import ManageRiddles from "@/pages/admin/ManageRiddlesPage";

// ---- Mocks ----
jest.mock("@/api/RiddlesAPI", () => ({
    getRiddles: jest.fn(),
    deleteRiddle: jest.fn(),
}));

jest.mock("../../api/LoggerAPI", () => ({
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
 * We expose buttons to simulate form success.
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
 * shadcn Dialog renders in a portal; easiest way is to mock it into a simple conditional render.
 * This keeps tests stable.
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

// shadcn Input/Button/Card are fine to use real, but if your aliasing makes it hard in Jest,
// you can mock them. Usually not needed if your jest config resolves @/.

import { getRiddles, deleteRiddle } from "@/api/RiddlesAPI";
import { toast } from "sonner";
import { logFrontend } from "../../api/LoggerAPI";

const sampleRiddles = [
    { id: 1, question: "Alpha question", answer: "First", file: null },
    { id: 2, question: "Bravo", answer: "Second", file: "https://example.com/file.pdf" },
];

function setLocationHref() {
    // component uses globalThis.location.href; in jest it exists but you can make sure:
    Object.defineProperty(globalThis, "location", {
        value: { href: "http://localhost/test" },
        writable: true,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    setLocationHref();
});

describe("ManageRiddles", () => {
    test("loads riddles on mount and renders cards", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles);

        render(<ManageRiddles />);

        // during initial load, it may show loading text
        expect(screen.getByText(/Manage Riddles/i)).toBeInTheDocument();

        // after load
        expect(await screen.findByText("Alpha question")).toBeInTheDocument();
        expect(screen.getByText("Bravo")).toBeInTheDocument();

        // attachment badge + button appears for file
        expect(screen.getByText(/Has Media/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /View Attachment/i })).toHaveAttribute("href", "https://example.com/file.pdf");

        expect(getRiddles).toHaveBeenCalledTimes(1);
    });

    test("shows loading state when loading and no riddles yet", async () => {
        // keep promise pending a bit
        let resolveFn: (v: any) => void = () => { };
        (getRiddles as jest.Mock).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFn = resolve;
                })
        );

        render(<ManageRiddles />);

        // loading text appears
        expect(screen.getByText(/Loading riddles/i)).toBeInTheDocument();

        // finish
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
    });

    test("create dialog opens and onSuccess closes + reloads", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles).mockResolvedValueOnce(sampleRiddles);

        render(<ManageRiddles />);

        await screen.findByText("Alpha question");

        // click the create card
        fireEvent.click(screen.getByText(/Create New Riddle/i));
        expect(screen.getByText("Create New Riddle")).toBeInTheDocument();
        expect(screen.getByTestId("riddle-form-mode")).toHaveTextContent("create");

        // simulate success in form
        fireEvent.click(screen.getByTestId("riddle-form-success-create"));

        await waitFor(() => {
            // load called again after success
            expect(getRiddles).toHaveBeenCalledTimes(2);
        });
    });

    test("edit dialog opens with initial values and onSuccess reloads", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles).mockResolvedValueOnce(sampleRiddles);

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        // click the pencil of riddle 1 (first card)
        const pencilButtons = screen.getAllByTitle("Edit");
        fireEvent.click(pencilButtons[0]);

        expect(screen.getByText("Edit Riddle")).toBeInTheDocument();
        expect(screen.getByTestId("riddle-form-mode")).toHaveTextContent("edit");

        fireEvent.click(screen.getByTestId("riddle-form-success-edit"));

        await waitFor(() => {
            expect(getRiddles).toHaveBeenCalledTimes(2);
        });
    });

    test("delete flow success: opens confirm dialog, calls delete, shows toast, reloads", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles).mockResolvedValueOnce(sampleRiddles);
        (deleteRiddle as jest.Mock).mockResolvedValueOnce(undefined);

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        // open delete confirm
        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        expect(screen.getByText(/Delete riddle\?/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));

        await waitFor(() => expect(deleteRiddle).toHaveBeenCalledWith(1));
        expect(toast.success).toHaveBeenCalledWith("Riddle deleted!");
        expect(getRiddles).toHaveBeenCalledTimes(2);
    });

    test("delete flow failure: logs + toast error, does not close unexpectedly", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles);
        (deleteRiddle as jest.Mock).mockRejectedValueOnce(new Error("nope"));

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getAllByTitle("Delete")[0]);
        fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to delete riddle"));
        expect(logFrontend).toHaveBeenCalled();
    });

    test("cancel delete closes dialog", async () => {
        (getRiddles as jest.Mock).mockResolvedValueOnce(sampleRiddles);

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getAllByTitle("Delete")[0]);
        expect(screen.getByText(/Delete riddle\?/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
        // Our mocked Dialog keeps content in DOM tree; but the state should close it:
        await waitFor(() => {
            expect(screen.queryByText(/Delete riddle\?/i)).not.toBeInTheDocument();
        });
    });
});
