import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { columns } from "../src/components/manageQuestions/ManageQuestionsColumns";
import type { Question } from "./../src/types/questions/Question.type";

const mockQuestion: Question = {
  question_id: 1,
  question_name: "Two Sum",
  question_description: "Given an array of integers, return indices of the two numbers such that they add up to a specific target.",
  difficulty: "Easy",
  language_specific_properties: [],
  tags: ["array", "hash-table"],
  testcases: [
    { test_case_id: 1, question_id: 1, input_data: "[2,7,11,15], 9", expected_output: "[0,1]" },
    { test_case_id: 2, question_id: 1, input_data: "[3,2,4], 6", expected_output: "[1,2]" },
  ],
  media: null,
  created_at: new Date(),
  last_modified_at: new Date(),
};
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
const createMockTable = (overrides = {}) => ({
  getIsAllRowsSelected: jest.fn(() => false),
  getIsSomeRowsSelected: jest.fn(() => false),
  toggleAllRowsSelected: jest.fn(),
  options: { meta: {} },
  ...overrides,
});

const createMockRow = (overrides = {}) => ({
  getValue: jest.fn((key: string) => mockQuestion[key as keyof Question]),
  getIsSelected: jest.fn(() => false),
  toggleSelected: jest.fn(),
  original: mockQuestion,
  ...overrides,
});

const createMockColumn = (overrides = {}) => ({
  toggleSorting: jest.fn(),
  getIsSorted: jest.fn(() => false),
  ...overrides,
});

describe("Question Columns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Select Column", () => {
    const selectColumn = columns[0];

    it("renders header checkbox unchecked", () => {
      const table = createMockTable();
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);

      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("renders header checkbox checked when all selected", () => {
      const table = createMockTable({ getIsAllRowsSelected: () => true });
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("renders header checkbox indeterminate when some selected", () => {
      const table = createMockTable({ getIsSomeRowsSelected: () => true });
      const Header = selectColumn.header as Function;
      const { container } = render(<>{Header({ table })}</>);

      expect(
        container.querySelector('[data-state="indeterminate"]')
      ).toBeInTheDocument();
    });

    it("toggles all rows on header checkbox change", () => {
      const table = createMockTable();
      const Header = selectColumn.header as Function;
      render(<>{Header({ table })}</>);

      fireEvent.click(screen.getByRole("checkbox"));
      expect(table.toggleAllRowsSelected).toHaveBeenCalledWith(true);
    });

    it("renders and toggles row checkbox", () => {
      const row = createMockRow();
      const Cell = selectColumn.cell as Function;
      render(<>{Cell({ row })}</>);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();

      fireEvent.click(checkbox);
      expect(row.toggleSelected).toHaveBeenCalledWith(true);
    });
  });

  describe("Title Column", () => {
    const titleColumn = columns[2];

    it("renders title", () => {
      const row = createMockRow();
      const Cell = titleColumn.cell as Function;
      render(<>{Cell({ row })}</>);

      expect(screen.getByText("Two Sum")).toBeInTheDocument();
    });

    it("toggles title sorting", () => {
      const column = createMockColumn({ getIsSorted: () => "asc" });
      const Header = titleColumn.header as Function;
      render(<>{Header({ column })}</>);

      fireEvent.click(screen.getByRole("button"));
      expect(column.toggleSorting).toHaveBeenCalledWith(true);
    });
  });

  describe("ID Column", () => {
    const idColumn = columns[1];

    it("toggles id sorting", () => {
      const column = createMockColumn();
      const Header = idColumn.header as Function;
      render(<>{Header({ column })}</>);

      fireEvent.click(screen.getByRole("button"));
      expect(column.toggleSorting).toHaveBeenCalledWith(false);
    });
  });

  describe("Description Column", () => {
    const descriptionColumn = columns[3];

    it("renders descriptions header", () => {
      const column = createMockColumn();
      const Header = descriptionColumn.header as Function;
      render(<>{Header({ column })}</>);

      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders descriptions cell", () => {
      const row = createMockRow();
      const Cell = descriptionColumn.cell as Function;
      render(<>{Cell({ row })}</>);

      expect(screen.getByText(mockQuestion.question_description)).toBeInTheDocument();
    });
  });

  describe("Difficulty Column", () => {
    const difficultyColumn = columns[4];

    it("renders difficulty", () => {
      const row = createMockRow();
      const Cell = difficultyColumn.cell as Function;
      render(<>{Cell({ row })}</>);

      expect(screen.getByText(mockQuestion.difficulty)).toBeInTheDocument();
    });

    it("uses custom sorting order and falls back for unknown values", () => {
      const sortingFn = difficultyColumn.sortingFn as Function;
      const rowEasy = { getValue: () => "easy" };
      const rowHard = { getValue: () => "hard" };
      const rowUnknown = { getValue: () => "legendary" };

      expect(sortingFn(rowEasy, rowHard, "difficulty")).toBeLessThan(0);
      expect(sortingFn(rowUnknown, rowHard, "difficulty")).toBeGreaterThan(0);
    });

    it("renders medium difficulty with yellow style", () => {
      const row = createMockRow({ getValue: () => "Medium" });
      const Cell = difficultyColumn.cell as Function;
      const { container } = render(<>{Cell({ row })}</>);

      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(container.querySelector(".text-yellow-500")).toBeInTheDocument();
    });

    it("toggles sorting from not sorted to ascending", () => {
          const column = createMockColumn();
          const Header = difficultyColumn.header as Function;
          render(<>{Header({ column })}</>);
    
          fireEvent.click(screen.getByRole("button"));
          expect(column.toggleSorting).toHaveBeenCalledWith(false);
        });
    
        it("toggles sorting from ascending to descending", () => {
          const column = createMockColumn({ getIsSorted: () => "asc" });
          const Header = difficultyColumn.header as Function;
          render(<>{Header({ column })}</>);
    
          fireEvent.click(screen.getByRole("button"));
          expect(column.toggleSorting).toHaveBeenCalledWith(true);
        });
    
  });
});
