import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsCell } from "./../src/components/manage-accounts/UserActionsCell";
import type { Account } from "./../src/types/Account";
import { toast } from "sonner";

jest.mock("./../src/api/manageAccounts", () => ({
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
    const apiModule = require("./../src/api/manageAccounts");
    updateAccount = apiModule.updateAccount;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Dropdown Menu", () => {
    it("renders dropdown trigger button", () => {
      render(<ActionsCell user={mockUser} />);
      // Prefer the accessible name the component already renders
      const button = screen.getByRole("button", { name: /open menu/i });
      expect(button).toBeInTheDocument();
    });

    it("renders an icon inside the trigger (ellipsis or more-horizontal)", () => {
      const { container } = render(<ActionsCell user={mockUser} />);
      // Be robust to icon name changes (lucide-ellipsis vs lucide-more-horizontal)
      const icon =
        container.querySelector('[class*="more-horizontal"]') ||
        container.querySelector('[class*="ellipsis"]') ||
        container.querySelector('button[aria-haspopup="menu"] svg');
      expect(icon).toBeInTheDocument();
    });

    it("opens dropdown menu on click", async () => {
      const user = userEvent.setup();
      render(<ActionsCell user={mockUser} />);
      const button = screen.getByRole("button", { name: /open menu/i });
      await user.click(button);
      expect(await screen.findByText("Actions")).toBeInTheDocument();
    });

    it("copies user ID to clipboard", async () => {
      const user = userEvent.setup();
      const writeTextMock = jest.fn();
      // In JSDOM, navigator.clipboard is a getter; define it explicitly
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
      });

      render(<ActionsCell user={mockUser} />);
      const button = screen.getByRole("button", { name: /open menu/i });
      await user.click(button);

      const copyItem = await screen.findByRole("menuitem", { name: /copy user id/i });
      await user.click(copyItem);

      expect(writeTextMock).toHaveBeenCalledWith("1");
    });

    it("has a menu separator", async () => {
      const user = userEvent.setup();
      render(<ActionsCell user={mockUser} />);
      const button = screen.getByRole("button", { name: /open menu/i });
      await user.click(button);

      // Radix portals menu content to document.body → query the screen, not container
      const separator = await screen.findByRole("separator");
      expect(separator).toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    it("shows success toast on successful update", async () => {
      const user = userEvent.setup();
      updateAccount.mockResolvedValue({
        id: 1,
        firstName: "Jane",
        lastName: "Doe",
        email: "john@example.com",
        accountType: "Admin",
      });

      render(<ActionsCell user={mockUser} />);

      const trigger = screen.getByRole("button", { name: /open menu/i });
      await user.click(trigger);

      const editMenuItem = await screen.findByRole("menuitem", { name: /edit user/i });
      await user.click(editMenuItem);

      const firstNameInput = await screen.findByLabelText("First Name");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Jane");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("User updated successfully!");
      });
    });
  });
});
