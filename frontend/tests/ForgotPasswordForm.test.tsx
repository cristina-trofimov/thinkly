import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordForm from "../src/components/forms/ForgotPasswordForm";
import { forgotPassword } from "../src/api/AuthAPI";
import { BrowserRouter } from "react-router-dom";

// Mock the API
jest.mock("@/api/AuthAPI", () => ({
  forgotPassword: jest.fn(),
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
      expect(screen.getByText(/email sent/i)).toBeInTheDocument();
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
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });

  it("navigates to login when button clicked", () => {
    renderForm();
    const button = screen.getByText(/go to login/i);
    fireEvent.click(button);
    expect(mockedNavigate).toHaveBeenCalledWith("/");
  });
});
