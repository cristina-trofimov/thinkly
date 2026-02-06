import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useNavigate } from "react-router-dom";

// Using relative paths to source files as requested
import CreateCompetition from "../src/views/admin/CreateCompetitionPage";
import * as CompetitionAPI from "../src/api/CompetitionAPI";
import * as QuestionsAPI from "../src/api/QuestionsAPI";

// FIX: Define the mock function outside so it can be verified in assertions
const mockNavigate = jest.fn();
jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
// Mocking react-router-dom so that calling useNavigate() returns our mock function
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mocking API modules and utilities using relative paths
jest.mock("../src/api/CompetitionAPI");
jest.mock("../src/api/QuestionsAPI");
jest.mock("../src/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));
jest.mock("../src/components/manageCompetitions/BuildEmail", () => jest.fn(() => "Automated Email Content"));

// Mock TimeInput to render a simple controlled input (the real component uses a read-only input + popover)
jest.mock("../src/helpers/TimeInput", () => {
  const React = require("react");
  return {
    TimeInput: React.forwardRef(
      ({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string }, ref: React.Ref<HTMLInputElement>) =>
        React.createElement("input", {
          ref,
          id,
          value: value || "",
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
          placeholder: placeholder || "Select time",
        })
    ),
  };
});

describe("CreateCompetitionPage", () => {
  const mockQuestions = [
    { id: "1", title: "Two Sum", difficulty: "easy" },
    { id: "2", title: "Add Two Numbers", difficulty: "medium" },
  ];
  const mockRiddles = [
    { id: "101", riddle_question: "What has keys but no locks?", question: "What has keys but no locks?" },
    { id: "102", riddle_question: "What gets wetter as it dries?", question: "What gets wetter as it dries?" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (QuestionsAPI.getQuestions as jest.Mock).mockResolvedValue(mockQuestions);
    (QuestionsAPI.getRiddles as jest.Mock).mockResolvedValue(mockRiddles);
  });

  /**
   * Helper to select a question or riddle from the available pools.
   * Targets the row container to find the specific "Plus" button.
   */
  const addItemFromPool = (text: string) => {
    const itemText = screen.getByText(text);
    const rowContainer = itemText.closest('.group');
    if (!rowContainer) throw new Error(`Could not find row container for ${text}`);
    
    const addBtn = within(rowContainer as HTMLElement).getByRole("button");
    fireEvent.click(addBtn);
  };

  test("renders correctly and loads data from API", async () => {
    render(<CreateCompetition />);
    expect(screen.getByText(/Create New Competition/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText("Two Sum")).toBeInTheDocument();
      expect(screen.getByText("What has keys but no locks?")).toBeInTheDocument();
    });
  });

  test("shows validation error when required fields are missing", async () => {
    render(<CreateCompetition />);
    const submitBtn = screen.getByText(/Publish Competition/i);
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/Please fill in all general information fields/i)).toBeInTheDocument();
  });

  test("enforces that question and riddle counts must match", async () => {
    render(<CreateCompetition />);
    await waitFor(() => screen.getByText("Two Sum"));

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Mismatch Test" } });
    fireEvent.change(screen.getByLabelText(/Event Date/i), { target: { value: "2099-12-31" } });
    
    // FIX: Exact regex matches to prevent collisions with "Send to all participants" switch
    fireEvent.change(screen.getByLabelText(/^Start$/i), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText(/^End$/i), { target: { value: "12:00" } });

    // Trigger specific mismatch logic
    addItemFromPool("Two Sum");
    addItemFromPool("Add Two Numbers");
    addItemFromPool("What has keys but no locks?");

    fireEvent.click(screen.getByText(/Publish Competition/i));
    expect(await screen.findByText(/Count mismatch: 2 Questions vs 1 Riddles/i)).toBeInTheDocument();
  });

  test("submits valid form data correctly and navigates with refresh state", async () => {
    (CompetitionAPI.createCompetition as jest.Mock).mockResolvedValue({ id: 99 });
    
    render(<CreateCompetition />);
    
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Successful Comp" } });
    fireEvent.change(screen.getByLabelText(/Event Date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/^Start$/i), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText(/^End$/i), { target: { value: "11:00" } });

    await waitFor(() => screen.getByText("Two Sum"));
    addItemFromPool("Two Sum");
    addItemFromPool("What has keys but no locks?");

    fireEvent.click(screen.getByText(/Publish Competition/i));

    // Verify the API call was made with casted values
    await waitFor(() => {
      expect(CompetitionAPI.createCompetition).toHaveBeenCalledWith(expect.objectContaining({
        name: "Successful Comp",
        selectedQuestions: [1],
        selectedRiddles: [101],
      }));
    });

    // FIX: Verification of the navigation call using the correctly factory-mocked useNavigate
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/app/dashboard/competitions", expect.objectContaining({
        state: expect.objectContaining({ refresh: expect.any(Number) }),
        replace: true
      }));
    });
  });

  test("handles submission errors and displays them", async () => {
    (CompetitionAPI.createCompetition as jest.Mock).mockRejectedValue({
      response: { 
        status: 400,
        data: { detail: "Competition name already exists" }
      }
    });

    render(<CreateCompetition />);
    
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Duplicate" } });
    fireEvent.change(screen.getByLabelText(/Event Date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/^Start$/i), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText(/^End$/i), { target: { value: "11:00" } });

    await waitFor(() => screen.getByText("Two Sum"));
    addItemFromPool("Two Sum");
    addItemFromPool("What has keys but no locks?");

    fireEvent.click(screen.getByText(/Publish Competition/i));
    expect(await screen.findByText(/Competition name already exists/i)).toBeInTheDocument();
  });
});