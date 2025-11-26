import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsCell } from "./../src/components/manageAccounts/UserActionsCell";
import type { Account } from "./../src/types/account/Account.type";
import { toast } from "sonner";

jest.mock("./../src/api/AccountsAPI", () => ({
  updateAccount: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUser: Account = {
  id: 1,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  accountType: "Admin",
};

describe("UserActionsCell", () => {
  let updateAccount: jest.Mock;

  beforeAll(() => {
    const apiModule = require("./../src/api/AccountsAPI");
    updateAccount = apiModule.updateAccount;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dropdown trigger and icon", () => {
    const { container } = render(<ActionsCell user={mockUser} />);
    const button = screen.getByRole("button", { name: /open menu/i });
    expect(button).toBeInTheDocument();
    const icon =
      container.querySelector('[class*="ellipsis"]') ||
      container.querySelector('[class*="more-horizontal"]') ||
      container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("opens dropdown and shows menu items", async () => {
    const user = userEvent.setup();
    render(<ActionsCell user={mockUser} />);
    const button = screen.getByRole("button", { name: /open menu/i });
    await user.click(button);
    expect(await screen.findByText("Actions")).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: /copy user id/i })).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: /edit user/i })).toBeInTheDocument();
  });

  it("copies user ID to clipboard", async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
    });
    render(<ActionsCell user={mockUser} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /copy user id/i }));
    expect(writeTextMock).toHaveBeenCalledWith("1");
  });

  it("opens edit dialog and displays fields", async () => {
    const user = userEvent.setup();
    render(<ActionsCell user={mockUser} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit user/i }));

    expect(await screen.findByText("Edit User")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toHaveValue("John");
    expect(screen.getByLabelText("Last Name")).toHaveValue("Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("updates fields and calls updateAccount successfully", async () => {
    const user = userEvent.setup();
    updateAccount.mockResolvedValue({
      id: 1,
      firstName: "Jane",
      lastName: "Doe",
      email: "john@example.com",
      accountType: "Admin",
    });

    render(<ActionsCell user={mockUser} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit user/i }));

    const firstNameInput = await screen.findByLabelText("First Name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith(1, { first_name: "Jane" });
      expect(toast.success).toHaveBeenCalledWith("User updated successfully!");
    });
  });

  it("calls onUserUpdate callback with API response", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = jest.fn();
    const updated = { ...mockUser, firstName: "Jane" };
    updateAccount.mockResolvedValue(updated);

    render(<ActionsCell user={mockUser} onUserUpdate={mockOnUpdate} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit user/i }));

    const firstNameInput = await screen.findByLabelText("First Name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(updated);
    });
  });

  it("handles error on update and shows toast.error", async () => {
    const user = userEvent.setup();
    updateAccount.mockRejectedValue(new Error("fail"));
    render(<ActionsCell user={mockUser} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit user/i }));

    const firstNameInput = await screen.findByLabelText("First Name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "ErrorTest");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update user.");
    });
  });

  it("skips API call when no changes made", async () => {
    const user = userEvent.setup();
    render(<ActionsCell user={mockUser} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit user/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(updateAccount).not.toHaveBeenCalled();
  });

  it("closes dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ActionsCell user={mockUser} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit user/i }));

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText("Make changes to the user account here.")).not.toBeInTheDocument();
    });
  });
});
