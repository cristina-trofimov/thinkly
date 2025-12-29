import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordForm from "../src/components/forms/ForgotPasswordForm";
import { forgotPassword } from "../src/api/AuthAPI";
import { BrowserRouter } from "react-router-dom";
import { toast } from "sonner";

// Mock the API
jest.mock("@/api/AuthAPI", () => ({
  forgotPassword: jest.fn(),
}));

// Mock the logger API
jest.mock("@/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

// Mock toast notifications
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderForm = () =>
    render(
      <BrowserRouter>
        <ForgotPasswordForm />
      </BrowserRouter>
    );

  it("renders the form correctly", () => {
    renderForm();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/send reset link/i)).toBeInTheDocument();
    expect(screen.getByText(/go to login/i)).toBeInTheDocument();
  });

  it("updates input value on change", () => {
    renderForm();
    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });
    expect(input.value).toBe("test@example.com");
  });

  it("submits form and shows success message", async () => {
    (forgotPassword as jest.Mock).mockResolvedValue({ message: "Email sent" });
    renderForm();

    const input = screen.getByLabelText(/email/i);
    const button = screen.getByText(/send reset link/i);

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(toast.success).toHaveBeenCalledWith(
        "If the account exists, a password reset email has been sent."
      );
    });
  });

  it("shows error message on API failure", async () => {
    (forgotPassword as jest.Mock).mockRejectedValue({
      response: { data: { error: "User not found" } },
    });

    renderForm();

    const input = screen.getByLabelText(/email/i);
    const button = screen.getByText(/send reset link/i);

    fireEvent.change(input, { target: { value: "wrong@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong. Try again.");
    });
  });

  it("navigates to login when button clicked", () => {
    renderForm();
    const button = screen.getByText(/go to login/i);
    fireEvent.click(button);
    expect(mockedNavigate).toHaveBeenCalledWith("/");
  });

  it("shows loading state during submission", async () => {
    (forgotPassword as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderForm();

    const input = screen.getByLabelText(/email/i);
    const button = screen.getByText(/send reset link/i);

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    expect(screen.getByText(/sending.../i)).toBeInTheDocument();
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText(/sending.../i)).not.toBeInTheDocument();
    });
  });

  it("clears previous messages on new submission", async () => {
    (forgotPassword as jest.Mock).mockResolvedValue({ message: "Email sent" });

    renderForm();

    const input = screen.getByLabelText(/email/i);
    const button = screen.getByText(/send reset link/i);

    // First submission
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "If the account exists, a password reset email has been sent."
      );
    });

    // Clear mock
    (toast.success as jest.Mock).mockClear();

    // Second submission
    fireEvent.change(input, { target: { value: "test2@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "If the account exists, a password reset email has been sent."
      );
    });
  });

  it("requires email field", () => {
    renderForm();
    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  it("has correct email input type", () => {
    renderForm();
    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input.type).toBe("email");
  });

  it("has autocomplete disabled", () => {
    renderForm();
    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input.autocomplete).toBe("off");
  });
});