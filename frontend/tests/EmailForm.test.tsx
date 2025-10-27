/// <reference types="jest" />

// ---- Polyfill ResizeObserver for Radix / JSDOM ----
class RO {
    constructor(_cb: ResizeObserverCallback) { }
    observe(_target?: Element) { }
    unobserve(_target?: Element) { }
    disconnect() { }
}
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || RO;
// ---- End Fix ----

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SendEmailForm from "../src/components/layout/EmailForm"

// --- Mocks ---
jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));
const { toast } = jest.requireMock("sonner");

// Reset fetch for each test
beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
});

// Use a single userEvent instance (recommended)
const user = userEvent.setup();

function getInputs() {
    return {
        to: screen.getByLabelText(/to \(comma-separated\)/i),
        subject: screen.getByLabelText(/subject/i),
        text: screen.getByLabelText(/message/i),
        schedule: screen.getByLabelText(/schedule \(local time, optional\)/i),
        sendBtn: screen.getByRole("button", { name: /^send/i }),
    };
}

function mockFetchOnceOk(json: any = { message: "OK" }) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => json,
    });
}

function mockFetchOnceError(status = 400, json: any = { error: "Bad Request" }) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => json,
    });
}

describe("SendEmailForm", () => {
    test("renders essential fields and button", () => {
        render(<SendEmailForm />);
        const { to, subject, text, schedule, sendBtn } = getInputs();
        expect(to).toBeInTheDocument();
        expect(subject).toBeInTheDocument();
        expect(text).toBeInTheDocument();
        expect(schedule).toBeInTheDocument();
        expect(sendBtn).toBeInTheDocument();
    });

    test("does not submit and shows error when 'to' is empty", async () => {
        render(<SendEmailForm />);
        const { subject, text, sendBtn } = getInputs();

        await user.type(subject, "Hello");
        await user.type(text, "Body");
        await user.click(sendBtn);

        expect(global.fetch).not.toHaveBeenCalled();

        // Your zod schema shows: "Enter at least one recipient (comma-separated)"
        // so assert that (instead of "Provide at least one recipient")
        expect(
            await screen.findByText(/Enter at least one recipient \(comma-separated\)/i)
        ).toBeInTheDocument();
    });

    test("splits comma-separated recipients and posts minimal payload", async () => {
        render(<SendEmailForm />);
        const { to, subject, text, sendBtn } = getInputs();

        await user.type(to, "alice@example.com,  bob@example.com");
        await user.type(subject, "Greetings");
        await user.type(text, "Howdy");

        mockFetchOnceOk();

        await user.click(sendBtn);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0];

        // Endpoint should match the hard-coded string in the component
        expect(url).toBe("http://127.0.0.1:8000/send-email");

        const parsed = JSON.parse((init as RequestInit).body as string);
        expect(parsed).toEqual({
            to: ["alice@example.com", "bob@example.com"],
            subject: "Greetings",
            text: "Howdy",
        });

        expect(toast.success).toHaveBeenCalledWith("Email sent ✅", expect.anything());
    });

    test("includes sendAt from datetime-local input (UTC 'Z' string present)", async () => {
        render(<SendEmailForm />);
        const { to, subject, text, schedule, sendBtn } = getInputs();

        await user.type(to, "tina@example.com");
        await user.type(subject, "Sched");
        await user.type(text, "Later please");

        // local datetime string
        fireEvent.change(schedule, { target: { value: "2025-10-26T16:00" } });

        mockFetchOnceOk();

        await user.click(sendBtn);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const parsed = JSON.parse((init as RequestInit).body as string);

        expect(parsed.to).toEqual(["tina@example.com"]);
        expect(parsed.subject).toBe("Sched");
        expect(parsed.text).toBe("Later please");
        expect(typeof parsed.sendAt).toBe("string");
        expect(parsed.sendAt.endsWith("Z")).toBe(true);

        expect(toast.success).toHaveBeenCalledWith("Email scheduled ✅", expect.anything());
    });

    test("when 'Send in 1 minute' is enabled, it overrides the custom schedule", async () => {
        // Avoid fake timers (they can conflict with user-event). Instead, mock Date.now.
        const nowSpy = jest
            .spyOn(Date, "now")
            .mockReturnValue(new Date("2025-10-26T16:00:00Z").getTime());

        render(<SendEmailForm />);
        const { to, subject, text, schedule, sendBtn } = getInputs();

        await user.type(to, "now@example.com");
        await user.type(subject, "Now-ish");
        await user.type(text, "Soon");

        // provide a schedule but it should be ignored
        fireEvent.change(schedule, { target: { value: "2025-12-31T23:59" } });

        // Toggle the actual switch by role (robust)
        const sw = screen.getByRole("switch", { name: /send in 1 minute/i });
        await user.click(sw);

        mockFetchOnceOk();

        await user.click(sendBtn);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const parsed = JSON.parse((init as RequestInit).body as string);

        expect(parsed.to).toEqual(["now@example.com"]);
        expect(parsed.subject).toBe("Now-ish");
        expect(parsed.text).toBe("Soon");

        const sendAtDate = new Date(parsed.sendAt).getTime();
        const nowPlus60 = new Date(Date.now() + 60_000).getTime();
        expect(Math.abs(sendAtDate - nowPlus60)).toBeLessThanOrEqual(1500);

        expect(toast.success).toHaveBeenCalledWith("Email scheduled ✅", expect.anything());

        nowSpy.mockRestore();
    });



    test("resets form after successful send", async () => {
        render(<SendEmailForm />);
        const { to, subject, text, schedule, sendBtn } = getInputs();

        await user.type(to, "a@a.com");
        await user.type(subject, "S");
        await user.type(text, "B");
        fireEvent.change(schedule, { target: { value: "2025-10-26T16:00" } });

        mockFetchOnceOk();

        await user.click(sendBtn);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        expect((to as HTMLInputElement).value).toBe("");
        expect((subject as HTMLInputElement).value).toBe("");
        expect((text as HTMLTextAreaElement).value).toBe("");
        expect((schedule as HTMLInputElement).value).toBe("");
    });

    test("button shows 'Sending…' and is disabled during submit", async () => {
        // Keep real timers; use a pending promise to simulate in-flight fetch.
        let resolveFetch!: (v?: unknown) => void;
        const fetchPromise = new Promise((res) => (resolveFetch = res));
        (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

        render(<SendEmailForm />);
        const { to, subject, text, sendBtn } = getInputs();

        await user.type(to, "x@y.com");
        await user.type(subject, "sub");
        await user.type(text, "body");

        await user.click(sendBtn);

        expect(sendBtn).toBeDisabled();
        expect(sendBtn).toHaveTextContent(/sending…/i);

        await act(async () => {
            resolveFetch({
                ok: true,
                status: 200,
                json: async () => ({ message: "OK" }),
            });
            await Promise.resolve();
        });

        await waitFor(() => expect(sendBtn).not.toBeDisabled());
        expect(sendBtn).toHaveTextContent(/^send$/i);
    });

    test("trims recipients and ignores empty entries", async () => {
        render(<SendEmailForm />);
        const { to, subject, text, sendBtn } = getInputs();

        await user.type(to, "  anna@example.com , ,  bob@example.com  , ");
        await user.type(subject, "Hi");
        await user.type(text, "Msg");

        mockFetchOnceOk();

        await user.click(sendBtn);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const parsed = JSON.parse((init as RequestInit).body as string);
        expect(parsed.to).toEqual(["anna@example.com", "bob@example.com"]);
    });

    test("uses exact endpoint hard-coded in component", async () => {
        render(<SendEmailForm />);
        const { to, subject, text, sendBtn } = getInputs();

        await user.type(to, "z@z.com");
        await user.type(subject, "E");
        await user.type(text, "F");

        mockFetchOnceOk();

        await user.click(sendBtn);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const [url] = (global.fetch as jest.Mock).mock.calls[0];
        expect(url).toBe("http://127.0.0.1:8000/send-email");
    });
});
