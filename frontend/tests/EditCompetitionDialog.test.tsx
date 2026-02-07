import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EditCompetitionDialog from "../src/components/manageCompetitions/EditCompetitionDialog";
import { getCompetitionById, updateCompetition } from "../src/api/CompetitionAPI";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";

// 1. Mocks
jest.mock("@/api/CompetitionAPI");
jest.mock("@/api/LoggerAPI");
jest.mock("sonner");

// Mock the child component to simplify testing the Dialog wrapper logic
jest.mock("@/components/forms/CompetitionForm", () => ({
  CompetitionForm: ({ initialData, onSubmit, onCancel }: any) => (
    <div data-testid="mock-form">
      <button onClick={() => onSubmit({ name: "Updated Name" })}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
      <pre>{JSON.stringify(initialData)}</pre>
    </div>
  ),
}));

describe("EditCompetitionDialog", () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();
  const competitionId = 123;

  const mockCompetitionData = {
    id: 123,
    name: "Original Competition",
    date: "2026-05-20",
    startTime: "10:00",
    endTime: "12:00",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and displays competition data when opened", async () => {
    (getCompetitionById as jest.Mock).mockResolvedValue(mockCompetitionData);

    render(
      <EditCompetitionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        competitionId={competitionId}
      />
    );

    // Should show loading state (returning null) initially
    expect(screen.queryByTestId("mock-form")).not.toBeInTheDocument();

    // Wait for the API call and the form to render
    await waitFor(() => {
      expect(getCompetitionById).toHaveBeenCalledWith(competitionId);
      expect(screen.getByTestId("mock-form")).toBeInTheDocument();
    });

    expect(screen.getByText(/"Original Competition"/)).toBeInTheDocument();
  });

  it("handles API errors during fetching", async () => {
    (getCompetitionById as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    render(
      <EditCompetitionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        competitionId={competitionId}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch competition details.");
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("calls updateCompetition and handles success", async () => {
    (getCompetitionById as jest.Mock).mockResolvedValue(mockCompetitionData);
    (updateCompetition as jest.Mock).mockResolvedValue({});

    render(
      <EditCompetitionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        competitionId={competitionId}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => screen.getByTestId("mock-form"));

    // Click the submit button inside our mocked CompetitionForm
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(updateCompetition).toHaveBeenCalledWith({
        name: "Updated Name",
        id: competitionId,
      });
      expect(toast.success).toHaveBeenCalledWith("Competition updated!");
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("logs error and shows toast on update failure", async () => {
    const error = new Error("Network Error");
    (getCompetitionById as jest.Mock).mockResolvedValue(mockCompetitionData);
    (updateCompetition as jest.Mock).mockRejectedValue(error);

    render(
      <EditCompetitionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        competitionId={competitionId}
      />
    );

    await waitFor(() => screen.getByTestId("mock-form"));
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed.");
      expect(logFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "ERROR",
          component: "EditCompetitionDialog",
        })
      );
    });
  });

  it("closes the dialog when Cancel is clicked in the form", async () => {
    (getCompetitionById as jest.Mock).mockResolvedValue(mockCompetitionData);

    render(
      <EditCompetitionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        competitionId={competitionId}
      />
    );

    await waitFor(() => screen.getByTestId("mock-form"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});