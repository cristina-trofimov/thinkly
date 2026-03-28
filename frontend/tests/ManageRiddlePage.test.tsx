import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import ManageRiddles from "../src/views/admin/ManageRiddlePage";

// ---- Mocks ----
jest.mock("@/api/RiddlesAPI", () => ({
    getRiddlesPage: jest.fn(),
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

jest.mock("@/components/ui/pagination", () => ({
    Pagination: ({ children }: any) => <nav>{children}</nav>,
    PaginationContent: ({ children }: any) => <div>{children}</div>,
    PaginationEllipsis: () => <span>...</span>,
    PaginationItem: ({ children }: any) => <div>{children}</div>,
    PaginationLink: ({ children, onClick, isActive, ...props }: any) => (
        <button type="button" onClick={onClick} data-active={isActive ? "true" : "false"} {...props}>{children}</button>
    ),
    PaginationNext: ({ onClick, ...props }: any) => (
        <button type="button" onClick={onClick} {...props}>Next</button>
    ),
    PaginationPrevious: ({ onClick, ...props }: any) => (
        <button type="button" onClick={onClick} {...props}>Previous</button>
    ),
}));

jest.mock("@/components/ui/select", () => ({
    Select: ({ children }: any) => <div>{children}</div>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children }: any) => <div>{children}</div>,
    SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
    SelectValue: () => <span />,
}));

/**
 * ✅ FIXED Dialog mock:
 * - supports controlled open + onOpenChange
 * - DialogTrigger asChild opens it
 * - DialogContent only renders when open (prevents duplicate create/edit DOM)
 */
jest.mock("@/components/ui/dialog", () => {
    const React = require("react");

    const Ctx = React.createContext({
        open: false,
        setOpen: (_v: boolean) => { },
    });

    function Dialog({ open, onOpenChange, children }: any) {
        const [internalOpen, setInternalOpen] = React.useState(!!open);

        React.useEffect(() => {
            if (typeof open === "boolean") setInternalOpen(open);
        }, [open]);

        const setOpen = (v: boolean) => {
            setInternalOpen(v);
            onOpenChange?.(v);
        };

        return (
            <Ctx.Provider value={{ open: internalOpen, setOpen }}>
                <div>{children}</div>
            </Ctx.Provider>
        );
    }

    function DialogTrigger({ asChild, children }: any) {
        const { setOpen } = React.useContext(Ctx);

        if (asChild && React.isValidElement(children)) {
            return React.cloneElement(children, {
                onClick: (e: any) => {
                    children.props?.onClick?.(e);
                    setOpen(true);
                },
            });
        }

        return (
            <button type="button" onClick={() => setOpen(true)}>
                {children}
            </button>
        );
    }

    function DialogContent({ children }: any) {
        const { open } = React.useContext(Ctx);
        if (!open) return null;
        return <div data-testid="dialog-content">{children}</div>;
    }

    return {
        Dialog,
        DialogTrigger,
        DialogContent,
        DialogHeader: ({ children }: any) => <div>{children}</div>,
        DialogTitle: ({ children }: any) => <div>{children}</div>,
        DialogFooter: ({ children }: any) => <div>{children}</div>,
    };
});

import { getRiddlesPage, deleteRiddle } from "@/api/RiddlesAPI";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";

const sampleRiddles = [
    { id: 1, question: "Alpha question", answer: "First", file: null },
    { id: 2, question: "Bravo", answer: "Second", file: "https://example.com/file.pdf" },
];

const paginatedRiddles = (items = sampleRiddles, page = 1, pageSize = 23, total = items.length) => ({
    total,
    page,
    pageSize,
    items,
});

const expectRiddleSkeletonsToRender = () => {
    expect(screen.getByText(/Create New Riddle/i)).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
};

beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, "Test", "/test");
});

describe("ManageRiddles", () => {
    test("loads riddles on mount and renders cards", async () => {
        (getRiddlesPage as jest.Mock).mockResolvedValueOnce(paginatedRiddles());

        render(<ManageRiddles />);

        expect(screen.getByText(/Manage Riddles/i)).toBeInTheDocument();

        expect(await screen.findByText("Alpha question")).toBeInTheDocument();
        expect(screen.getByText("Bravo")).toBeInTheDocument();

        expect(screen.getByText(/Has Media/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /View Attachment/i })).toHaveAttribute(
            "href",
            "https://example.com/file.pdf"
        );

        expect(getRiddlesPage).toHaveBeenCalledWith({ page: 1, pageSize: 23, search: "" });
    });

    test("shows loading state when loading and no riddles yet", async () => {
        let resolveFn: (v: any) => void = () => { };
        (getRiddlesPage as jest.Mock).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFn = resolve;
                })
        );

        render(<ManageRiddles />);

        expectRiddleSkeletonsToRender();

        resolveFn(paginatedRiddles([]));
        await waitFor(() => expect(getRiddlesPage).toHaveBeenCalled());
    });

    test("search sends the query to the backend", async () => {
        (getRiddlesPage as jest.Mock)
            .mockResolvedValueOnce(paginatedRiddles())
            .mockResolvedValueOnce(paginatedRiddles([sampleRiddles[0]], 1, 23, 1));
        render(<ManageRiddles />);

        await screen.findByText("Alpha question");
        const input = screen.getByPlaceholderText(/Search question or answer/i);

        fireEvent.change(input, { target: { value: "alpha" } });
        await waitFor(() => {
            expect(getRiddlesPage).toHaveBeenLastCalledWith({ page: 1, pageSize: 23, search: "alpha" });
        });
    });

    test("logs + toast error when getRiddles fails", async () => {
        (getRiddlesPage as jest.Mock).mockRejectedValueOnce(new Error("boom"));

        render(<ManageRiddles />);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load riddles"));
        expect(logFrontend).toHaveBeenCalled();

        const logArg = (logFrontend as jest.Mock).mock.calls[0][0];
        expect(logArg.level).toBe("ERROR");
        expect(logArg.component).toBe("ManageRiddlesPage.tsx");
        expect(typeof logArg.url).toBe("string");
    });

    test("create dialog opens and onSuccess closes + reloads riddles", async () => {
        (getRiddlesPage as jest.Mock)
            .mockResolvedValueOnce(paginatedRiddles())
            .mockResolvedValueOnce(paginatedRiddles());

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getByText(/Create New Riddle/i));
        expect(screen.getByTestId("riddle-form-mode")).toHaveTextContent("create");

        fireEvent.click(screen.getByTestId("riddle-form-success-create"));

        await waitFor(() => {
            expect(getRiddlesPage).toHaveBeenCalledTimes(2);
        });
    });

    test("edit dialog opens and onSuccess closes + reloads riddles", async () => {
        (getRiddlesPage as jest.Mock)
            .mockResolvedValueOnce(paginatedRiddles())
            .mockResolvedValueOnce(paginatedRiddles());

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getAllByTitle("Edit")[0]);

        expect(screen.getByText("Edit Riddle")).toBeInTheDocument();
        expect(screen.getByTestId("riddle-form-mode")).toHaveTextContent("edit");

        fireEvent.click(screen.getByTestId("riddle-form-success-edit"));

        await waitFor(() => {
            expect(getRiddlesPage).toHaveBeenCalledTimes(2);
        });
    });

    test("delete flow success: confirm delete calls API, shows toast, reloads", async () => {
        (getRiddlesPage as jest.Mock)
            .mockResolvedValueOnce(paginatedRiddles())
            .mockResolvedValueOnce(paginatedRiddles());
        (deleteRiddle as jest.Mock).mockResolvedValueOnce(undefined);

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getAllByTitle("Delete")[0]);
        expect(screen.getByText(/Delete riddle\?/i)).toBeInTheDocument();

        // ✅ ensure we click the confirm button inside the dialog, not trash icons
        const confirmBtn = (await screen.findByText(/^Delete$/i)).closest("button")!;
        // (or: within(dialog).getByText(/^Delete$/i).closest("button")!)
        fireEvent.click(confirmBtn);

        await waitFor(() => expect(deleteRiddle).toHaveBeenCalledWith(1));
        expect(toast.success).toHaveBeenCalledWith("Riddle deleted!");
        expect(getRiddlesPage).toHaveBeenCalledTimes(2);
    });

    test("delete flow failure: logs + toast error", async () => {
        (getRiddlesPage as jest.Mock).mockResolvedValueOnce(paginatedRiddles());
        (deleteRiddle as jest.Mock).mockRejectedValueOnce(new Error("nope"));

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getAllByTitle("Delete")[0]);

        const confirmBtn = (await screen.findByText(/^Delete$/i)).closest("button")!;
        fireEvent.click(confirmBtn);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to delete riddle"));
        expect(logFrontend).toHaveBeenCalled();

        const logArg = (logFrontend as jest.Mock).mock.calls[0][0];
        expect(logArg.level).toBe("ERROR");
        expect(logArg.component).toBe("ManageRiddlesPage.tsx");
    });

    // ✅ Added: cancel delete closes dialog
    test("cancel delete closes dialog", async () => {
        (getRiddlesPage as jest.Mock).mockResolvedValueOnce(paginatedRiddles());

        render(<ManageRiddles />);
        await screen.findByText("Alpha question");

        fireEvent.click(screen.getAllByTitle("Delete")[0]);
        expect(screen.getByText(/Delete riddle\?/i)).toBeInTheDocument();

        // click Cancel in the dialog
        fireEvent.click(screen.getByText(/Cancel/i).closest("button")!);

        await waitFor(() => {
            expect(screen.queryByText(/Delete riddle\?/i)).not.toBeInTheDocument();
        });
    });

    // ✅ Added: no attachment link if file is null
    test("renders no attachment button when file is null", async () => {
        (getRiddlesPage as jest.Mock).mockResolvedValueOnce(
            paginatedRiddles([{ id: 1, question: "Q", answer: "A", file: null }], 1, 23, 1)
        );

        render(<ManageRiddles />);

        await screen.findByText("Q");
        expect(screen.queryByRole("link", { name: /View Attachment/i })).not.toBeInTheDocument();
    });
});
