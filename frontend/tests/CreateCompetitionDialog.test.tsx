
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateCompetitionDialog from "./CreateCompetitionDialog";

function openDialog() {
    const onOpenChange = vi.fn();
    render(<CreateCompetitionDialog open={true} onOpenChange={onOpenChange} />);
    return { onOpenChange };
}

const QUESTIONS_URL = "http://127.0.0.1:8000/questions";
const EMAIL_URL = "http://127.0.0.1:8001/send-email";

beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === QUESTIONS_URL) {
            return Promise.resolve(
                new Response(
                    JSON.stringify([
                        { id: 101, title: "Two Sum", difficulty: "easy" },
                        { id: 202, title: "Binary Tree Level Order", difficulty: "Medium" },
                    ]),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                )
            ) as any;
        }
        return Promise.resolve(new Response("{}", { status: 200 })) as any;
    });
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("CreateCompetitionDialog", () => {
    it("loads questions from backend and displays them", async () => {
        openDialog();


        await waitFor(() =>
            expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
        );
        expect(
            screen.getByText(/Binary Tree Level Order/i)
        ).toBeInTheDocument();

        // Difficulty labels normalized
        expect(screen.getByText("Easy")).toBeInTheDocument();
        expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("falls back to hardcoded question list when fetch fails", async () => {
        (global.fetch as any).mockImplementationOnce((input: any) => {

            return Promise.resolve(new Response("boom", { status: 500 }));
        });

        openDialog();


        await waitFor(() =>
            expect(screen.getByText(/Two Sums/i)).toBeInTheDocument()
        );
    });

    it("filters questions by search", async () => {
        openDialog();

        await waitFor(() =>
            expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
        );

        const search = screen.getByPlaceholderText(/Search questions/i);
        await userEvent.type(search, "Binary");

        expect(screen.queryByText(/Two Sum/i)).not.toBeInTheDocument();
        expect(
            screen.getByText(/Binary Tree Level Order/i)
        ).toBeInTheDocument();
    });

    it("allows selecting questions and riddles", async () => {
        openDialog();

        await waitFor(() =>
            expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
        );

        const twoSumRow = screen.getByText(/Two Sum/i).closest("div")!;
        const qCheckbox = twoSumRow.parentElement?.parentElement?.querySelector(
            'button[role="checkbox"]'
        ) as HTMLElement;
        await userEvent.click(qCheckbox);

        const riddleRow = screen.getByText(/Where's Waldo\?/i).closest("div")!;
        const rCheckbox = riddleRow.parentElement?.parentElement?.querySelector(
            'button[role="checkbox"]'
        ) as HTMLElement;
        await userEvent.click(rCheckbox);


        expect(qCheckbox).toHaveAttribute("aria-checked", "true");
        expect(rCheckbox).toHaveAttribute("aria-checked", "true");
    });

    it("shows validation error when fields are missing", async () => {
        openDialog();

        const createBtn = screen.getByRole("button", { name: /Create Competition/i });
        await userEvent.click(createBtn);

        expect(
            await screen.findByText(/Incomplete general information/i)
        ).toBeInTheDocument();
    });

    it("validates that start time must be in the future", async () => {
        openDialog();

        await userEvent.type(screen.getByLabelText(/Competition Name/i), "My Comp");


        const dateInput = screen.getByLabelText(/^Date$/i);
        const startInput = screen.getByLabelText(/^Start Time$/i);
        const endInput = screen.getByLabelText(/^End Time$/i);

        await userEvent.clear(dateInput);
        await userEvent.type(dateInput as HTMLInputElement, "2000-01-01");
        await userEvent.type(startInput as HTMLInputElement, "00:01");
        await userEvent.type(endInput as HTMLInputElement, "00:10");

        await waitFor(() =>
            expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
        );
        const twoSumRow = screen.getByText(/Two Sum/i).closest("div")!;
        const qCheckbox = twoSumRow.parentElement?.parentElement?.querySelector(
            'button[role="checkbox"]'
        ) as HTMLElement;
        await userEvent.click(qCheckbox);

        const riddleRow = screen.getByText(/Where's Waldo\?/i).closest("div")!;
        const rCheckbox = riddleRow.parentElement?.parentElement?.querySelector(
            'button[role="checkbox"]'
        ) as HTMLElement;
        await userEvent.click(rCheckbox);

        await userEvent.click(screen.getByRole("button", { name: /Create Competition/i }));

        expect(
            await screen.findByText(/must be scheduled for a future date/i)
        ).toBeInTheDocument();
    });

    it("posts email payload to :8001 when email recipients are provided", async () => {
        const { onOpenChange } = openDialog();

        await waitFor(() =>
            expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
        );


        const now = new Date();
        const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const yyyy = future.getFullYear();
        const mm = String(future.getMonth() + 1).padStart(2, "0");
        const dd = String(future.getDate()).padStart(2, "0");

        await userEvent.type(screen.getByLabelText(/Competition Name/i), "Future Comp");
        await userEvent.clear(screen.getByLabelText(/^Date$/i));
        await userEvent.type(screen.getByLabelText(/^Date$/i), `${yyyy}-${mm}-${dd}`);
        await userEvent.type(screen.getByLabelText(/^Start Time$/i), "12:00");
        await userEvent.type(screen.getByLabelText(/^End Time$/i), "13:00");

        const qRow = screen.getByText(/Two Sum/i).closest("div")!;
        const qCheckbox = qRow.parentElement?.parentElement?.querySelector(
            'button[role="checkbox"]'
        ) as HTMLElement;
        await userEvent.click(qCheckbox);

        const rRow = screen.getByText(/Where's Waldo\?/i).closest("div")!;
        const rCheckbox = rRow.parentElement?.parentElement?.querySelector(
            'button[role="checkbox"]'
        ) as HTMLElement;
        await userEvent.click(rCheckbox);


        await userEvent.type(screen.getByLabelText(/To \(comma-separated\)/i), "alice@example.com, bob@example.com");
        await userEvent.type(screen.getByLabelText(/^Subject$/i), "Hello");
        await userEvent.type(screen.getByLabelText(/^Message$/i), "World");


        const fetchSpy = vi.spyOn(global, "fetch");

        await userEvent.click(screen.getByRole("button", { name: /Create Competition/i }));


        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                EMAIL_URL,
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.any(String),
                })
            );
        });


        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
