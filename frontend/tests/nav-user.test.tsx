/// <reference types="jest" />

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavUser } from "../src/components/layout/nav-user";
import { jest } from '@jest/globals';

// Mock the sidebar hook
const mockUseSidebar = jest.fn();

jest.mock("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children }: any) => (
    <div data-testid="sidebar-menu">{children}</div>
  ),
  SidebarMenuItem: ({ children }: any) => (
    <div data-testid="sidebar-menu-item">{children}</div>
  ),
  SidebarMenuButton: ({ children, className, size, ...props }: any) => (
    <button
      data-testid="sidebar-menu-button"
      className={className}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
  useSidebar: () => mockUseSidebar(),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src }: any) => (
    <img data-testid="avatar-image" src={src} alt="avatar" />
  ),
  AvatarFallback: ({ children, className }: any) => (
    <div data-testid="avatar-fallback" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children, asChild }: any) => (
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
  DropdownMenuItem: ({ children }: any) => (
    <div data-testid="dropdown-menu-item">{children}</div>
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
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    avatar: "/avatars/john.jpg",
  };

  beforeEach(() => {
    mockUseSidebar.mockReturnValue({ isMobile: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Avatar Fallback", () => {
    test("handles missing firstName gracefully", () => {
      const userWithoutFirstName = { ...mockUser, firstName: "" };
      render(<NavUser user={userWithoutFirstName} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("D");
      });
    });

    test("handles missing lastName gracefully", () => {
      const userWithoutLastName = { ...mockUser, lastName: "" };
      render(<NavUser user={userWithoutLastName} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("J");
      });
    });

    test("handles both names missing gracefully", () => {
      const userWithoutNames = { ...mockUser, firstName: "", lastName: "" };
      render(<NavUser user={userWithoutNames} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("");
      });
    });

    test("converts initials to uppercase", () => {
      const userLowercase = {
        ...mockUser,
        firstName: "jane",
        lastName: "smith",
      };
      render(<NavUser user={userLowercase} />);
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      fallbacks.forEach((fallback) => {
        expect(fallback).toHaveTextContent("JS");
      });
    });
  });

  describe("Dropdown Menu", () => {
    test("renders dropdown menu structure", () => {
      render(<NavUser user={mockUser} />);
      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-menu-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-menu-content")).toBeInTheDocument();
    });

    test("renders dropdown menu label with user info", () => {
      render(<NavUser user={mockUser} />);
      const label = screen.getByTestId("dropdown-menu-label");
      expect(within(label).getByText("John Doe")).toBeInTheDocument();
      expect(within(label).getByText("john.doe@example.com")).toBeInTheDocument();
    });

    test("renders Account menu item with icon", () => {
      render(<NavUser user={mockUser} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      expect(within(menuItems[0]).getByTestId("badge-check-icon")).toBeInTheDocument();
      expect(within(menuItems[0]).getByText("Account")).toBeInTheDocument();
    });

    test("renders Notifications menu item with icon", () => {
      render(<NavUser user={mockUser} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      expect(within(menuItems[1]).getByTestId("bell-icon")).toBeInTheDocument();
      expect(within(menuItems[1]).getByText("Notifications")).toBeInTheDocument();
    });

    test("renders Log out menu item with icon", () => {
      render(<NavUser user={mockUser} />);
      const menuItems = screen.getAllByTestId("dropdown-menu-item");
      expect(within(menuItems[2]).getByTestId("log-out-icon")).toBeInTheDocument();
      expect(within(menuItems[2]).getByText("Log out")).toBeInTheDocument();
    });

    test("renders two separators in dropdown menu", () => {
      render(<NavUser user={mockUser} />);
      const separators = screen.getAllByTestId("dropdown-menu-separator");
      expect(separators).toHaveLength(2);
    });

    test("renders dropdown menu group for Account and Notifications", () => {
      render(<NavUser user={mockUser} />);
      expect(screen.getByTestId("dropdown-menu-group")).toBeInTheDocument();
    });
  });

  describe("Mobile vs Desktop", () => {
    test("renders dropdown on right side when not mobile", () => {
      mockUseSidebar.mockReturnValue({ isMobile: false });
      render(<NavUser user={mockUser} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-side", "right");
    });

    test("renders dropdown on bottom when mobile", () => {
      mockUseSidebar.mockReturnValue({ isMobile: true });
      render(<NavUser user={mockUser} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-side", "bottom");
    });

    test("calls useSidebar hook", () => {
      render(<NavUser user={mockUser} />);
      expect(mockUseSidebar).toHaveBeenCalled();
    });
  });

  describe("Dropdown Menu Positioning", () => {
    test("dropdown menu aligns to end", () => {
      render(<NavUser user={mockUser} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-align", "end");
    });

    test("dropdown menu has correct side offset", () => {
      render(<NavUser user={mockUser} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveAttribute("data-side-offset", "4");
    });

    test("dropdown menu content has correct className", () => {
      render(<NavUser user={mockUser} />);
      const content = screen.getByTestId("dropdown-menu-content");
      expect(content).toHaveClass("w-(--radix-dropdown-menu-trigger-width)", "min-w-56", "rounded-lg");
    });
  });

  describe("Button Styling", () => {
    test("sidebar menu button has correct size", () => {
      render(<NavUser user={mockUser} />);
      const button = screen.getByTestId("sidebar-menu-button");
      expect(button).toHaveAttribute("data-size", "lg");
    });

    test("sidebar menu button has correct className for state styling", () => {
      render(<NavUser user={mockUser} />);
      const button = screen.getByTestId("sidebar-menu-button");
      expect(button).toHaveClass(
        "data-[state=open]:bg-sidebar-accent",
        "data-[state=open]:text-sidebar-accent-foreground"
      );
    });
  });

  describe("Text Truncation", () => {
    test("user name has truncate class", () => {
      render(<NavUser user={mockUser} />);
      const names = screen.getAllByText("John Doe");
      names.forEach((name) => {
        expect(name).toHaveClass("truncate");
      });
    });

    test("user email has truncate class", () => {
      render(<NavUser user={mockUser} />);
      const emails = screen.getAllByText("john.doe@example.com");
      emails.forEach((email) => {
        expect(email).toHaveClass("truncate");
      });
    });
  });
});