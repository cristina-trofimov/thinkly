/// <reference types="jest" />

import { render, screen, waitFor } from "@testing-library/react";
import { jest } from '@jest/globals';
import { AppSidebar } from "../src/components/layout/AppSidebar";
import '@testing-library/jest-dom';
import { UserContext } from '../src/context/UserContext';
import type { Account } from '../src/types/account/Account.type';

const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;



// Mock the child components
jest.mock("@/components/layout/NavSection", () => ({
  NavSection: ({ link, label }: any) => (
    <div data-testid="nav-section">
      <span>{label}</span>
      {link.map((item: any) => (
        <a key={item.name} href={item.url}>
          {item.name}
        </a>
      ))}
    </div>
  ),
}));

jest.mock('../src/lib/axiosClient', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}))

jest.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children, collapsible, ...props }: any) => (
    <aside data-testid="sidebar" data-collapsible={collapsible} {...props}>
      {children}
    </aside>
  ),
  SidebarContent: ({ children }: any) => (
    <div data-testid="sidebar-content">{children}</div>
  ),
  SidebarFooter: ({ children }: any) => (
    <div data-testid="sidebar-footer">{children}</div>
  ),
  SidebarHeader: ({ children }: any) => (
    <div data-testid="sidebar-header">{children}</div>
  ),
  SidebarMenu: ({ children }: any) => (
    <ul data-testid="sidebar-menu">{children}</ul>
  ),
  SidebarMenuButton: ({ children, asChild, size, ...props }: any) => (
    <div data-testid="sidebar-menu-button" data-size={size} {...props}>
      {children}
    </div>
  ),
  SidebarMenuItem: ({ children }: any) => (
    <li data-testid="sidebar-menu-item">{children}</li>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: any) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src }: any) => (
    <img data-testid="avatar-image" src={src} alt="avatar" />
  ),
  AvatarFallback: ({ children }: any) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

// NavUser is now in the top header, not the sidebar footer
jest.mock("@/components/layout/NavUser", () => ({
  NavUser: () => <div data-testid="nav-user">Nav User</div>,
}));

// Mock AppLayout dependencies so we can render it in integration tests
jest.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet" />,
  useMatches: () => [],
  MemoryRouter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../src/components/layout/AppBreadcrumb", () => ({
  AppBreadcrumbs: () => <nav data-testid="app-breadcrumbs" />,
}));

jest.mock("../src/components/layout/AppSidebar", () => {
  // Re-export the real AppSidebar so the Layout integration test uses it
  const actual = jest.requireActual("../src/components/layout/AppSidebar") as any;
  return actual;
});

// SidebarProvider / SidebarTrigger needed by Layout
jest.mock("../src/components/ui/sidebar", () => ({
  // Spread sidebar mock again for the Layout's imports
  SidebarProvider: ({ children }: any) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarTrigger: () => <button data-testid="sidebar-trigger" />,
  Sidebar: ({ children, collapsible, ...props }: any) => (
    <aside data-testid="sidebar" data-collapsible={collapsible} {...props}>
      {children}
    </aside>
  ),
  SidebarContent: ({ children }: any) => (
    <div data-testid="sidebar-content">{children}</div>
  ),
  SidebarFooter: ({ children }: any) => (
    <div data-testid="sidebar-footer">{children}</div>
  ),
  SidebarHeader: ({ children }: any) => (
    <div data-testid="sidebar-header">{children}</div>
  ),
  SidebarMenu: ({ children }: any) => (
    <ul data-testid="sidebar-menu">{children}</ul>
  ),
  SidebarMenuButton: ({ children, asChild, size, ...props }: any) => (
    <div data-testid="sidebar-menu-button" data-size={size} {...props}>
      {children}
    </div>
  ),
  SidebarMenuItem: ({ children }: any) => (
    <li data-testid="sidebar-menu-item">{children}</li>
  ),
}));

const mockUser: Account = {
  id: 1,
  firstName: 'shadcn',
  lastName: 'example',
  email: 'shadcn@example.com',
  accountType: 'Admin',
}

const mockContextValue = {
  user: mockUser,
  loading: false,
  setUser: jest.fn(),
  refreshUser: jest.fn() as () => Promise<void>,
}

const renderSidebar = (props = {}) =>
  render(
    <UserContext.Provider value={mockContextValue}>
      <AppSidebar {...props} />
    </UserContext.Provider>
  )

describe("AppSidebar", () => {
  test("renders sidebar with collapsible icon prop", () => {
    renderSidebar();
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-collapsible", "icon");
  });

  test("renders header with Thinkly branding", () => {
    renderSidebar();
    expect(screen.getByText("Thinkly")).toBeInTheDocument();
  });

  test("renders logo link pointing to /app/home", () => {
    renderSidebar();
    const link = screen.getByRole("link", { name: /thinkly/i });
    expect(link).toHaveAttribute("href", "/app/home");
  });

  test("renders avatar with correct image source", () => {
    renderSidebar();
    const avatarImage = screen.getByTestId("avatar-image");
    expect(avatarImage).toHaveAttribute("src", "/assets/thinkly_logo.png");
  });

  test("renders avatar fallback with 'T'", () => {
    renderSidebar();
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("T");
  });

  test("renders Platform navigation section", () => {
    renderSidebar();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  test("renders Other navigation section", () => {
    renderSidebar();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  test("renders all main navigation links", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "AlgoTime" })).toHaveAttribute(
      "href",
      "/app/algotime"
    );
    expect(screen.getByRole("link", { name: "Competitions" })).toHaveAttribute(
      "href",
      "/app/competitions"
    );
  });

  test("does not render NavUser inside the sidebar", () => {
    renderSidebar();
    // NavUser is now in the top header bar, not inside the sidebar
    expect(screen.queryByTestId("nav-user")).not.toBeInTheDocument();
  });

  test("does not render a sidebar footer", () => {
    renderSidebar();
    // Footer was intentionally removed when NavUser moved to the header
    expect(screen.queryByTestId("sidebar-footer")).not.toBeInTheDocument();
  });

  test("renders correct sidebar structure: header and content only", () => {
    renderSidebar();
    expect(screen.getByTestId("sidebar-header")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-footer")).not.toBeInTheDocument();
  });

  test("passes through additional props to Sidebar component", () => {
    renderSidebar({ 'data-custom': 'test-value' })
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-custom", "test-value");
  });

  test("renders two NavSection components", () => {
    renderSidebar();
    const navSections = screen.getAllByTestId("nav-section");
    expect(navSections).toHaveLength(2);
  });

  describe("Role-based navigation filtering", () => {
    test("shows Dashboard link for admin users", async () => {
      renderSidebar();
      await waitFor(() => {
        expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
      });
    });

    test("shows Leaderboards link for all authenticated users", async () => {
      renderSidebar();
      await waitFor(() => {
        expect(screen.getByRole("link", { name: "Leaderboards" })).toBeInTheDocument();
      });
    });
  });
});
