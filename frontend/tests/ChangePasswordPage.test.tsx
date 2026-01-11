import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ChangePasswordPage from "../src/views/ChangePasswordPage"; // Adjust path if necessary
import { changePassword } from "../src/api/AuthAPI";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// --- Mocks ---

jest.mock("../src/api/AuthAPI", () => ({
  changePassword: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Lucide icons to simplify the DOM
jest.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left" />,
  Loader2: () => <div data-testid="loader" />,
  KeyRound: () => <div data-testid="key-icon" />,
}));

describe("ChangePasswordPage Component", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renders the change password form correctly", () => {
    render(<ChangePasswordPage />);

    expect(screen.getByText("Change Password")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter your current password")).toBeTruthy();
    expect(screen.getByPlaceholderText("At least 8 characters")).toBeTruthy();
    expect(screen.getByPlaceholderText("Repeat your new password")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Update Password/i })).toBeTruthy();
  });

  test("navigates back when 'Back to Profile' is clicked", () => {
    render(<ChangePasswordPage />);
    const backButton = screen.getByText(/Back to Profile/i);
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test("shows error toast if fields are missing", async () => {
    render(<ChangePasswordPage />);
    const submitButton = screen.getByRole("button", { name: /Update Password/i });

    fireEvent.click(submitButton);

    expect(toast.error).toHaveBeenCalledWith("Please fill in all password fields.");
    expect(changePassword).not.toHaveBeenCalled();
  });

  test("shows error toast if new passwords do not match", async () => {
    render(<ChangePasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat your new password"), { target: { value: "new-password-2" } });

    const submitButton = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitButton);

    expect(toast.error).toHaveBeenCalledWith("New passwords do not match.");
    expect(screen.getByText("Passwords do not match")).toBeTruthy();
  });

  test("shows error toast if new password is too short", async () => {
    render(<ChangePasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "short" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat your new password"), { target: { value: "short" } });

    const submitButton = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitButton);

    expect(toast.error).toHaveBeenCalledWith("New password must be at least 8 characters long.");
  });

  test("successfully updates password and navigates back", async () => {
    (changePassword as jest.Mock).mockResolvedValue({ success: true });
    render(<ChangePasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "current123" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "newsecret123" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat your new password"), { target: { value: "newsecret123" } });

    const submitButton = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitButton);

    // Verify loading state
    expect(screen.getByText(/Updating Security.../i)).toBeTruthy();

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        old_password: "current123",
        new_password: "newsecret123",
      });
      expect(toast.success).toHaveBeenCalledWith("Password updated successfully.");
    });

    // Fast-forward the navigation timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test("handles API errors gracefully", async () => {
    const errorResponse = {
      response: {
        data: {
          detail: "Your current password was incorrect.",
        },
      },
    };
    (changePassword as jest.Mock).mockRejectedValue(errorResponse);
    
    render(<ChangePasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "wrong-pass" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "validpassword123" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat your new password"), { target: { value: "validpassword123" } });

    const submitButton = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Your current password was incorrect.");
      // Ensure button returns to normal state
      expect(screen.getByRole("button", { name: "Update Password" })).toBeTruthy();
    });
  });

  test("disables inputs and buttons while submitting", async () => {
    (changePassword as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ChangePasswordPage />);
    
    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "current123" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "newsecret123" } });
    fireEvent.change(screen.getByPlaceholderText("Repeat your new password"), { target: { value: "newsecret123" } });

    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    expect(screen.getByPlaceholderText("Enter your current password")).toBeDisabled();
    expect(screen.getByPlaceholderText("At least 8 characters")).toBeDisabled();
    expect(screen.getByPlaceholderText("Repeat your new password")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Updating Security/i })).toBeDisabled();
  });
});