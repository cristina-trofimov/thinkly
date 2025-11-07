/// <reference types="jest" />

import { render, screen } from "@testing-library/react";
import { jest } from '@jest/globals';
import { AppSidebar } from "../src/components/layout/AppSidebar";
import '@testing-library/jest-dom';

// Mock the child components
jest.mock("@/components/layout/NavSection", () => ({
  NavSection: ({ link, label }: unknown) => (
    <div data-testid="nav-section">
      <span>{label}</span>
      {link.map((item: unknown) => (
        <a key={item.name} href={item.url}>
          {item.name}
        </a>
      ))}
    </div>
  ),
}));

jest.mock("@/components/layout/NavUser", () => ({
  NavUser: ({ user }: unknown) => (
    <div data-testid="nav-user">
      {user.firstName} {user.lastName}
    </div>
  ),
}));

jest.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children, ...props }: unknown) => (
    <aside data-testid="sidebar" {...props}>
      {children}
    </aside>
  ),
  SidebarContent: ({ children }: unknown) => (
    <div data-testid="sidebar-content">{children}</div>
  ),
  SidebarFooter: ({ children }: unknown) => (
    <div data-testid="sidebar-footer">{children}</div>
  ),
  SidebarHeader: ({ children }: unknown) => (
    <div data-testid="sidebar-header">{children}</div>
  ),
  SidebarMenu: ({ children }: unknown) => (
    <ul data-testid="sidebar-menu">{children}</ul>
  ),
  SidebarMenuButton: ({ children, ...props }: unknown) => (
    <button data-testid="sidebar-menu-button" {...props}>
      {children}
    </button>
  ),
  SidebarMenuItem: ({ children }: unknown) => (
    <li data-testid="sidebar-menu-item">{children}</li>
  ),
  SidebarRail: () => <div data-testid="sidebar-rail" />,
  SidebarTrigger: (props: unknown) => (
    <button data-testid="sidebar-trigger" {...props}>
      Toggle
    </button>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: unknown) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src }: unknown) => (
    <img data-testid="avatar-image" src={src} alt="avatar" />
  ),
  AvatarFallback: ({ children }: unknown) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

describe("AppSidebar", () => {
  test("renders sidebar with collapsible icon prop", () => {
    render(<AppSidebar />);
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("collapsible", "icon");
  });

  test("renders header with Thinkly branding", () => {
    render(<AppSidebar />);
    expect(screen.getByText("Thinkly")).toBeInTheDocument();
  });

  test("renders logo link pointing to /home", () => {
    render(<AppSidebar />);
    const link = screen.getByRole("link", { name: /thinkly/i });
    expect(link).toHaveAttribute("href", "/home");
  });

  test("renders avatar with correct image source", () => {
    render(<AppSidebar />);
    const avatarImage = screen.getByTestId("avatar-image");
    expect(avatarImage).toHaveAttribute("src", "/assets/thinkly_logo.png");
  });

  test("renders avatar fallback with 'T'", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("T");
  });

  test("renders sidebar trigger in header", () => {
    render(<AppSidebar />);
    const trigger = screen.getByTestId("sidebar-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveStyle({ color: "#8065CD" });
  });

  test("renders Platform navigation section", () => {
    render(<AppSidebar />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  test("renders Other navigation section", () => {
    render(<AppSidebar />);
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  test("renders all main navigation links", () => {
    render(<AppSidebar />);
    expect(screen.getByRole("link", { name: "AlgoTime" })).toHaveAttribute(
      "href",
      "/algotime"
    );
    expect(screen.getByRole("link", { name: "Competition" })).toHaveAttribute(
      "href",
      "/competition"
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });

  test("renders all other navigation links", () => {
    render(<AppSidebar />);
    expect(screen.getByRole("link", { name: "Leaderboards" })).toHaveAttribute(
      "href",
      "/leaderboards"
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  test("renders NavUser component with user data", () => {
    render(<AppSidebar />);
    const navUser = screen.getByTestId("nav-user");
    expect(navUser).toHaveTextContent("shadcn example");
  });

  test("renders sidebar rail", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("sidebar-rail")).toBeInTheDocument();
  });

  test("renders correct sidebar structure with header, content, and footer", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("sidebar-header")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument();
  });

  test("passes through additional props to Sidebar component", () => {
    render(<AppSidebar data-custom="test-value" />);
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-custom", "test-value");
  });

  test("renders two NavSection components", () => {
    render(<AppSidebar />);
    const navSections = screen.getAllByTestId("nav-section");
    expect(navSections).toHaveLength(2);
  });
});