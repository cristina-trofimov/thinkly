import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SessionQuestionSelector } from "../src/components/algotime/SessionQuestionSelector";
import type { Question } from "../src/types/questions/QuestionPagination.type";
import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";


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
  jest.mock("@/api/LoggerAPI");
  
  const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
  const mockedLogger = logFrontend as jest.Mock;

  jest.mock("date-fns", () => ({
    format: jest.fn(() => "Formatted Date"),
  }));
  
  describe("SessionQuestionSelector", () => {
    const mockToggle = jest.fn();
    const mockSetSearch = jest.fn();
    const mockSetDifficulty = jest.fn();
    const mockSetSessionNames = jest.fn();
  
    const mockQuestions: Question[] = [
      { question_id: 1, question_name: "Two Sum", difficulty: "Easy" } as Question,
      { question_id: 2, question_name: "Binary Tree", difficulty: "Medium" } as Question,
      { question_id: 3, question_name: "DP Hard", difficulty: "Hard" } as Question,
    ];
  
    const defaultProps = {
      sessionNumber: 1,
      sessionDate: "2026-02-01",
      questions: mockQuestions,
      sessionQuestions: { 1: [1] },
      searchQueries: { 1: "" },
      setSearchQueries: mockSetSearch,
      difficultyFilters: {},
      setDifficultyFilters: mockSetDifficulty,
      toggleQuestionForSession: mockToggle,
      getDifficultyColor: jest.fn(() => "bg-gray-100"),
      sessionNames: { 1: "Session A" },
      setSessionNames: mockSetSessionNames,
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe("rendering", () => {
      it("renders formatted session date", () => {
        render(<SessionQuestionSelector {...defaultProps} />);
  
        expect(screen.getByText("Formatted Date")).toBeInTheDocument();
      });
  
      it("renders session name input", () => {
        render(<SessionQuestionSelector {...defaultProps} />);
  
        expect(
          screen.getByDisplayValue("Session A")
        ).toBeInTheDocument();
      });
  
      it("renders selected question count", () => {
        render(<SessionQuestionSelector {...defaultProps} />);
  
        expect(screen.getByText("1 question(s) selected")).toBeInTheDocument();
      });
    });
  
    describe("search functionality", () => {
      it("calls setSearchQueries when typing", () => {
        render(<SessionQuestionSelector {...defaultProps} />);
  
        const searchInput = screen.getByPlaceholderText("Search questions...");
  
        fireEvent.change(searchInput, {
          target: { value: "tree" },
        });
  
        expect(mockSetSearch).toHaveBeenCalled();
      });
    });
  
    describe("session name editing", () => {
      it("updates session name when typing", () => {
        render(<SessionQuestionSelector {...defaultProps} />);
  
        const nameInput = screen.getByPlaceholderText(
          "Enter session name..."
        );
  
        fireEvent.change(nameInput, {
          target: { value: "New Session Name" },
        });
  
        expect(mockSetSessionNames).toHaveBeenCalled();
      });
    });
  
    describe("question selection", () => {
      it("calls toggleQuestionForSession when checkbox clicked", () => {
        render(<SessionQuestionSelector {...defaultProps} />);
  
        const checkbox = screen.getAllByRole("checkbox")[0];
  
        fireEvent.click(checkbox);
  
        expect(mockToggle).toHaveBeenCalledWith(1, 1);
      });
    });
  
    describe("difficulty filtering", () => {
      it("shows filtered questions based on search", () => {
        render(
          <SessionQuestionSelector
            {...defaultProps}
            searchQueries={{ 1: "binary" }}
          />
        );
  
        expect(screen.getByText("Binary Tree")).toBeInTheDocument();
        expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
      });
    });
  });