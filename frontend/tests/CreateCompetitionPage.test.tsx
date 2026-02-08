import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateCompetitionPage from "../src/views/admin/CreateCompetitionPage"; // Adjust path as needed
import { createCompetition } from "../src/api/CompetitionAPI";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";
import { useNavigate } from "react-router-dom";

// 1. Mocks
jest.mock("../src/api/CompetitionAPI");
jest.mock("../src/api/LoggerAPI");
jest.mock("sonner");
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

// Mock the child component to isolate the Page logic
jest.mock("../src/components/forms/CompetitionForm", () => ({
  CompetitionForm: ({ onSubmit, onCancel, submitLabel }: any) => (
    <div data-testid="mock-form">
      <span>{submitLabel}</span>
      <button onClick={() => onSubmit({ name: "New Competition" })}>Submit Form</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}));

describe("CreateCompetitionPage", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  it("renders the page with the correct back button and form label", () => {
    render(<CreateCompetitionPage />);
    
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Publish Competition")).toBeInTheDocument();
  });

  it("navigates back when the 'Back' button is clicked", () => {
    render(<CreateCompetitionPage />);
    
    fireEvent.click(screen.getByText("Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("navigates back when the form cancel button is clicked", () => {
    render(<CreateCompetitionPage />);
    
    fireEvent.click(screen.getByText("Cancel Form"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("calls createCompetition and redirects on successful submission", async () => {
    (createCompetition as jest.Mock).mockResolvedValue({ id: 1 });

    render(<CreateCompetitionPage />);

    fireEvent.click(screen.getByText("Submit Form"));

    await waitFor(() => {
      expect(createCompetition).toHaveBeenCalledWith({ name: "New Competition" });
      expect(mockNavigate).toHaveBeenCalledWith("/app/dashboard/competitions", {
        state: { success: true },
        replace: true,
      });
    });
  });

  it("shows error toast and logs failure when creation fails", async () => {
    const error = new Error("Validation Error");
    (createCompetition as jest.Mock).mockRejectedValue(error);

    render(<CreateCompetitionPage />);

    fireEvent.click(screen.getByText("Submit Form"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create competition.");
      expect(logFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "CreateCompetitionPage",
          message: expect.stringContaining("Validation Error"),
        })
      );
    });
    
    // Should NOT navigate away on failure
    expect(mockNavigate).not.toHaveBeenCalledWith("/app/dashboard/competitions", expect.anything());
  });
});