import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { columns } from "../src/components/manageQuestions/ManageQuestionsColumns";
import type { Question } from "./../src/types/questions/Question.type";

const mockQuestion: Question = {
  id: 1,
  title: "Two Sum",
  description: "Given an array of integers, return indices of the two numbers such that they add up to a specific target.",
  difficulty: "Easy",
  preset_code: "function twoSum(nums, target) {\n  // Your code here\n}",
  template_solution: "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}",
  media: null,
  date: new Date(),
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
    const titleColumn = columns[1];

    it("renders title", () => {
      const row = createMockRow();
      const Cell = titleColumn.cell as Function;
      render(<>{Cell({ row })}</>);

      expect(screen.getByText("Two Sum")).toBeInTheDocument();
    });
  });

  describe("Description Column", () => {
    const descriptionColumn = columns[2];

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

      expect(screen.getByText(mockQuestion.description)).toBeInTheDocument();
    });
  });

  describe("Difficulty Column", () => {
    const difficultyColumn = columns[3];

    it("renders difficulty", () => {
      const row = createMockRow();
      const Cell = difficultyColumn.cell as Function;
      render(<>{Cell({ row })}</>);

      expect(screen.getByText(mockQuestion.difficulty)).toBeInTheDocument();
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
