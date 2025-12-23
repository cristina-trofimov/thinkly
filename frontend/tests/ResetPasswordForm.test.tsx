import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordForm from "../src/components/forms/ResetPasswordForm";
import axiosClient from "../src/lib/axiosClient";
import { BrowserRouter } from "react-router-dom";

// Mock axiosClient
jest.mock("@/lib/axiosClient", () => ({
  post: jest.fn(),
}));

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  useSearchParams: () => [new URLSearchParams("token=validtoken")],
}));

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderForm = () =>
    render(
      <BrowserRouter>
        <ResetPasswordForm />
      </BrowserRouter>
    );

  it("renders the form with password inputs", () => {
    renderForm();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
  });

  it("shows error if password is too short", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByText(/reset password/i));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error if passwords do not match", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different123" } });
    fireEvent.click(screen.getByText(/reset password/i));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("submits form successfully and shows success message", async () => {
    (axiosClient.post as jest.Mock).mockResolvedValue({
      data: { message: "Password reset successfully!" },
    });

    renderForm();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByText(/reset password/i));

    await waitFor(() => {
      expect(axiosClient.post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "validtoken",
        new_password: "password123",
      });
      expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
    });
  });

  it("shows API error message on failure", async () => {
    (axiosClient.post as jest.Mock).mockRejectedValue({
      response: { data: { detail: "Invalid token" } },
    });

    renderForm();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByText(/reset password/i));

    await waitFor(() => {
      expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
    });
  });

  it("navigates to login when 'Go to Login' clicked", () => {
    renderForm();
    const button = screen.getByText(/go to login/i);
    fireEvent.click(button);
    expect(mockedNavigate).toHaveBeenCalledWith("/");
  });
});
