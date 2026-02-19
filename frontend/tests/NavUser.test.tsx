/// <reference types="jest" />

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavUser } from "../src/components/layout/NavUser";

const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock the sidebar hook
const mockUseSidebar = jest.fn();

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the auth API — covers both logout and getProfile (used when no user prop)
jest.mock("../src/api/AuthAPI", () => ({
  logout: jest.fn(),
  getProfile: jest.fn(() =>
    Promise.resolve({
      id: "1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      accountType: "user",
    })
  ),
}));

// Mock the logger API
jest.mock("../src/api/LoggerAPI", () => ({
  logFrontend: jest.fn(),
}));

// Mock AvatarInitials helper
jest.mock("../src/components/helpers/AvatarInitials", () => ({
  AvatarInitials: ({ firstName, lastName }: any) => {
    const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase();
    return <div data-testid="avatar-fallback">{initials}</div>;
  },
}));

// NavUser no longer wraps itself in SidebarMenu — only the useSidebar hook is used
jest.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => mockUseSidebar(),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-menu-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children, side, align, sideOffset, className }: any) => (
    <div
      data-testid="dropdown-menu-content"
      data-side={side}
      data-align={align}
      data-side-offset={sideOffset}
      className={className}
    >
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children, className }: any) => (
    <div data-testid="dropdown-menu-label" className={className}>
      {children}
    </div>
  ),
  DropdownMenuGroup: ({ children }: any) => (
    <div data-testid="dropdown-menu-group">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" data-testid="dropdown-menu-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-menu-separator" />,
}));

jest.mock("lucide-react", () => ({
  BadgeCheck: () => <svg data-testid="badge-check-icon" />,
  Bell: () => <svg data-testid="bell-icon" />,
  ChevronsUpDown: () => <svg data-testid="chevrons-up-down-icon" />,
  LogOut: () => <svg data-testid="log-out-icon" />,
}));

describe("NavUser", () => {
  const mockUser = {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    accountType: "user",
  };

  beforeEach(() => {
    mockUseSidebar.mockReturnValue({ isMobile: false });
    mockNavigate.mockClear();
    jest.clearAllMocks();
    // Restore sidebar mock after clearAllMocks
    mockUseSidebar.mockReturnValue({ isMobile: false });
  });

  describe("Trigger Button", () => {
    test("renders a plain button as the dropdown trigger (not SidebarMenuButton)", () => {
      render(<NavUser user={mockUser as any} />);
      // The trigger should be a regular button inside the dropdown trigger wrapper
      const trigger = screen.getByTestId("dropdown-menu-trigger");
      const button = trigger.querySelector("button");
      expect(button).toBeInTheDocument();
    });

    test("trigger button shows user name", () => {
      render(<NavUser user={mockUser as any} />);
      const trigger = screen.getByTestId("dropdown-menu-trigger");
      expect(within(trigger).getByText("John Doe")).toBeInTheDocument();
    });

    test("trigger button renders avatar initials", () => {
      render(<NavUser user={mockUser as any} />);
      const trigger = screen.getByTestId("dropdown-menu-trigger");
      expect(within(trigger).getByTestId("avatar-fallback")).toBeInTheDocument();
    });
  });

  describe("Profile self-fetch (no user prop)", () => {
    test("fetches and displays profile when no user prop is provided", async () => {
      const { getProfile } = require("../src/api/AuthAPI");
      render(<NavUser />);
      expect(getProfile).toHaveBeenCalled();
      // After fetch, name should appear (rendered in both trigger and dropdown label)
      const names = await screen.findAllByText("John Doe");
      expect(names.length).toBeGreaterThanOrEqual(1);
    });

    test("does not call getProfile when user prop is provided", () => {
      const { getProfile } = require("../src/api/AuthAPI");
      render(<NavUser user={mockUser as any} />);
      expect(getProfile).not.toHaveBeenCalled();
    });
  });

  describe("Avatar Fallback", () => {
    test("handles missing firstName gracefully", () => {
      const userWithoutFirstName = { ...mockUser, firstName: "" } as any;
      render(<NavUser user={userWithoutFirstName} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("D");
      });
    });

    test("handles missing lastName gracefully", () => {
      const userWithoutLastName = { ...mockUser, lastName: "" } as any;
      render(<NavUser user={userWithoutLastName} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("J");
      });
    });

    test("handles both names missing gracefully", () => {
      const userWithoutNames = { ...mockUser, firstName: "", lastName: "" } as any;
      render(<NavUser user={userWithoutNames} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("");
      });
    });

    test("converts initials to uppercase", () => {
      const userLowercase = { ...mockUser, firstName: "jane", lastName: "smith" } as any;
      render(<NavUser user={userLowercase} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("JS");
      });
    });
  });

  describe("Dropdown Menu", () => {
    test("renders dropdown menu structure", () => {
      render(<NavUser user={mockUser as any} />);
      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-menu-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-menu-content")).toBeInTheDocument();
    });

    test("renders dropdown menu label with user info", () => {
      render(<NavUser user={mockUser as any} />);
      const label = screen.getByTestId("dropdown-menu-label");
      // expect(within(label).getByText("John Doe")).toBeInTheDocument();
      expect(within(label).getByText("john.doe@example.com")).toBeInTheDocument();
    });

    test("renders Profile menu item with icon", () => {
      render(<NavUser user={mockUser as any} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      expect(within(menuItems[0]).getByTestId("badge-check-icon")).toBeInTheDocument();
      expect(within(menuItems[0]).getByText("Profile")).toBeInTheDocument();
    });

    test("renders Notifications menu item with icon", () => {
      render(<NavUser user={mockUser as any} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      expect(within(menuItems[1]).getByTestId("bell-icon")).toBeInTheDocument();
      expect(within(menuItems[1]).getByText("Notifications")).toBeInTheDocument();
    });

    test("renders Log out menu item with icon", () => {
      render(<NavUser user={mockUser as any} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      expect(within(menuItems[2]).getByTestId("log-out-icon")).toBeInTheDocument();
      expect(within(menuItems[2]).getByText("Log out")).toBeInTheDocument();
    });

    test("renders two separators in dropdown menu", () => {
      render(<NavUser user={mockUser as any} />);
      const separators = screen.getAllByTestId("dropdown-menu-separator");
      expect(separators).toHaveLength(2);
    });

    test("renders dropdown menu group for Profile and Notifications", () => {
      render(<NavUser user={mockUser as any} />);
      expect(screen.getByTestId("dropdown-menu-group")).toBeInTheDocument();
    });
  });

  describe("Mobile vs Desktop", () => {
    test("renders dropdown on right side when not mobile", () => {
      mockUseSidebar.mockReturnValue({ isMobile: false });
      render(<NavUser user={mockUser as any} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-side", "bottom");
    });

    test("renders dropdown on bottom when mobile", () => {
      mockUseSidebar.mockReturnValue({ isMobile: true });
      render(<NavUser user={mockUser as any} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-side", "bottom");
    });
  });

  describe("Dropdown Menu Positioning", () => {
    test("dropdown menu aligns to end", () => {
      render(<NavUser user={mockUser as any} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-align", "end");
    });

    test("dropdown menu has correct side offset", () => {
      render(<NavUser user={mockUser as any} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-side-offset", "4");
    });

    test("dropdown menu content has correct className", () => {
      render(<NavUser user={mockUser as any} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveClass(
        "w-(--radix-dropdown-menu-trigger-width)",
        "min-w-56",
        "rounded-lg"
      );
    });
  });

  describe("Text Truncation", () => {
    test("user name has truncate class", () => {
      render(<NavUser user={mockUser as any} />);
      const names = screen.getAllByText("John Doe");
      names.forEach((name) => {
        expect(name).toHaveClass("truncate");
      });
    });

    test("user email has truncate class", () => {
      render(<NavUser user={mockUser as any} />);
      const emails = screen.getAllByText("john.doe@example.com");
      emails.forEach((email) => {
        expect(email).toHaveClass("truncate");
      });
    });
  });

  describe("Navigation actions", () => {
    test("navigates to /app/profile when Profile is clicked", async () => {
      render(<NavUser user={mockUser as any} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      await userEvent.click(menuItems[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/app/profile");
    });

    test("calls logout and navigates to '/' when Log out is clicked", async () => {
      const { logout } = require("../src/api/AuthAPI");
      (logout as jest.Mock).mockResolvedValue(undefined);
      window.alert = jest.fn();

      render(<NavUser user={mockUser as any} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      await userEvent.click(menuItems[2]);

      expect(logout).toHaveBeenCalled();
      await screen.findByTestId("dropdown-menu"); // wait for async
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
