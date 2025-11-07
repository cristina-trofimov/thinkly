/// <reference types="jest" />

import { render, screen } from "@testing-library/react";
import { Home, Settings, User } from "lucide-react";
import { NavSection } from "../src/components/layout/NavSection";
import { jest } from '@jest/globals';
import * as SidebarModule from "@/components/ui/sidebar";

// Mock the sidebar components and hook
jest.mock("@/components/ui/sidebar", () => ({
  SidebarGroup: ({ children }: unknown) => (
    <div data-testid="sidebar-group">{children}</div>
  ),
  SidebarGroupLabel: ({ children }: unknown) => (
    <div data-testid="sidebar-group-label">{children}</div>
  ),
  SidebarMenu: ({ children }: unknown) => (
    <ul data-testid="sidebar-menu">{children}</ul>
  ),
  SidebarMenuItem: ({ children }: unknown) => (
    <li data-testid="sidebar-menu-item">{children}</li>
  ),
  SidebarMenuButton: ({ children, tooltip }: unknown) => (
    <button data-testid="sidebar-menu-button" data-tooltip={tooltip}>
      {children}
    </button>
  ),
  useSidebar: jest.fn(() => ({
    state: "expanded",
    open: true,
    setOpen: jest.fn(),
  })),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Home: () => <svg data-testid="home-icon" />,
  Settings: () => <svg data-testid="settings-icon" />,
  User: () => <svg data-testid="user-icon" />,
}));

describe("NavSection", () => {
  const mockLinks = [
    {
      name: "Home",
      url: "/home",
      icon: Home,
    },
    {
      name: "Settings",
      url: "/settings",
      icon: Settings,
    },
    {
      name: "Profile",
      url: "/profile",
      icon: User,
    },
  ];

  test("renders the section label correctly", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    expect(screen.getByTestId("sidebar-group-label")).toHaveTextContent(
      "Main Menu"
    );
  });

  test("renders all navigation items", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    const menuItems = screen.getAllByTestId("sidebar-menu-item");
    expect(menuItems).toHaveLength(3);
  });

  test("renders all link names", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  test("renders all links with correct href attributes", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    const homeLink = screen.getByRole("link", { name: /home/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    const profileLink = screen.getByRole("link", { name: /profile/i });

    expect(homeLink).toHaveAttribute("href", "/home");
    expect(settingsLink).toHaveAttribute("href", "/settings");
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  test("renders icons for each navigation item", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    expect(screen.getByTestId("home-icon")).toBeInTheDocument();
    expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });

  test("renders tooltips for each menu button", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    const buttons = screen.getAllByTestId("sidebar-menu-button");
    
    expect(buttons[0]).toHaveAttribute("data-tooltip", "Home");
    expect(buttons[1]).toHaveAttribute("data-tooltip", "Settings");
    expect(buttons[2]).toHaveAttribute("data-tooltip", "Profile");
  });

  test("renders with empty link array", () => {
    render(<NavSection link={[]} label="Empty Section" />);
    expect(screen.getByTestId("sidebar-group-label")).toHaveTextContent(
      "Empty Section"
    );
    const menuItems = screen.queryAllByTestId("sidebar-menu-item");
    expect(menuItems).toHaveLength(0);
  });

  test("renders with single link", () => {
    const singleLink = [
      {
        name: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
    ];
    render(<NavSection link={singleLink} label="Single Item" />);
    
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  test("calls useSidebar hook", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    expect(SidebarModule.useSidebar).toHaveBeenCalled();
  });

  test("renders correct component structure", () => {
    render(<NavSection link={mockLinks} label="Main Menu" />);
    expect(screen.getByTestId("sidebar-group")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-menu")).toBeInTheDocument();
  });

  test("handles special characters in link names", () => {
    const specialLinks = [
      {
        name: "Settings & Preferences",
        url: "/settings",
        icon: Settings,
      },
      {
        name: "User's Profile",
        url: "/profile",
        icon: User,
      },
    ];
    render(<NavSection link={specialLinks} label="Special Section" />);
    
    expect(screen.getByText("Settings & Preferences")).toBeInTheDocument();
    expect(screen.getByText("User's Profile")).toBeInTheDocument();
  });

  test("handles URLs with query parameters", () => {
    const linksWithParams = [
      {
        name: "Search",
        url: "/search?q=test&filter=all",
        icon: Home,
      },
    ];
    render(<NavSection link={linksWithParams} label="Search Section" />);
    
    const link = screen.getByRole("link", { name: /search/i });
    expect(link).toHaveAttribute("href", "/search?q=test&filter=all");
  });

  test("handles URLs with hash fragments", () => {
    const linksWithHash = [
      {
        name: "Overview",
        url: "/docs#overview",
        icon: Home,
      },
    ];
    render(<NavSection link={linksWithHash} label="Docs Section" />);
    
    const link = screen.getByRole("link", { name: /overview/i });
    expect(link).toHaveAttribute("href", "/docs#overview");
  });
});