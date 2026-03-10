import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionActionsCell from "../src/components/manageQuestions/QuestionActionsCell";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../src/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("QuestionActionsCell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows edit/delete actions and executes both", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();

    render(
      <QuestionActionsCell
        question={{
          question_id: 15,
          question_name: "Q",
          question_description: "Desc",
          media: null,
          language_specific_properties: [],
          difficulty: "Easy",
          tags: [],
          testcases: [],
          created_at: new Date("2025-01-01"),
          last_modified_at: new Date("2025-01-01"),
        }}
        onDelete={onDelete}
      />
    );

    expect(screen.queryByRole("button", { name: /copy question id/i })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /edit question as json/i }));
    expect(mockNavigate).toHaveBeenCalledWith("./editQuestion/15");

    await user.click(await screen.findByRole("button", { name: /delete question/i }));
    expect(onDelete).toHaveBeenCalledWith(15);
  });

  it("does not crash when onDelete is omitted", async () => {
    const user = userEvent.setup();

    render(
      <QuestionActionsCell
        question={{
          question_id: 99,
          question_name: "Q",
          question_description: "Desc",
          media: null,
          language_specific_properties: [],
          difficulty: "Easy",
          tags: [],
          testcases: [],
          created_at: new Date("2025-01-01"),
          last_modified_at: new Date("2025-01-01"),
        }}
      />
    );

    await user.click(await screen.findByRole("button", { name: /delete question/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
