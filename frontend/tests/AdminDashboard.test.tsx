// Add TextEncoder/TextDecoder polyfill for Jest
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { AdminDashboard } from "../src/components/dashboard/AdminDashboard";

// Mock child components
jest.mock("@/components/dashboard/StatsCard", () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid="stats-card">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

jest.mock("@/components/dashboard/ManageCard", () => ({
  ManageCard: ({ title, items }: { title: string; items: unknown[] }) => (
    <div data-testid="manage-card">
      <span>{title}</span>
      <span>{items.length} items</span>
    </div>
  ),
}));

jest.mock("@/components/dashboard/TechnicalIssuesChart", () => ({
  TechnicalIssuesChart: () => <div data-testid="technical-issues-chart">Chart</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button className={className}>{children}</button>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconCirclePlusFilled: () => <svg data-testid="icon-circle-plus" />,
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the dashboard title", () => {
    render(<AdminDashboard />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("renders the Create Competition button", () => {
    render(<AdminDashboard />);
    const button = screen.getByRole("button", { name: /create competition/i });
    expect(button).toBeInTheDocument();
  });

  it("renders the Create Competition button with correct icon", () => {
    render(<AdminDashboard />);
    expect(screen.getByTestId("icon-circle-plus")).toBeInTheDocument();
  });

  it("renders all three StatsCard components", () => {
    render(<AdminDashboard />);
    const statsCards = screen.getAllByTestId("stats-card");
    expect(statsCards).toHaveLength(3);
  });

  it("renders StatsCard with correct titles", () => {
    render(<AdminDashboard />);
    expect(screen.getByText("New Accounts")).toBeInTheDocument();
    expect(screen.getByText("Completed Competitions to Date")).toBeInTheDocument();
    expect(screen.getByText("User satisfaction")).toBeInTheDocument();
  });

  it("renders StatsCard with correct values", () => {
    render(<AdminDashboard />);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("renders all three ManageCard components", () => {
    render(<AdminDashboard />);
    const manageCards = screen.getAllByTestId("manage-card");
    expect(manageCards).toHaveLength(3);
  });

  it("renders ManageCard with correct titles", () => {
    render(<AdminDashboard />);
    expect(screen.getByText("Manage Accounts")).toBeInTheDocument();
    expect(screen.getByText("Manage Competitions")).toBeInTheDocument();
    expect(screen.getByText("Manage Questions")).toBeInTheDocument();
  });

  it("renders the TechnicalIssuesChart component", () => {
    render(<AdminDashboard />);
    expect(screen.getByTestId("technical-issues-chart")).toBeInTheDocument();
  });

  it("has correct layout structure", () => {
    const { container } = render(<AdminDashboard />);
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass("flex", "flex-col", "w-full");
  });

  it("renders header with correct styling", () => {
    const { container } = render(<AdminDashboard />);
    const header = container.querySelector(".border-b.border-\\[\\#E5E5E5\\]");
    expect(header).toBeInTheDocument();
  });

  it("renders stats cards section with correct spacing", () => {
    const { container } = render(<AdminDashboard />);
    const statsSection = container.querySelector(".flex.gap-6.mt-6.px-6");
    expect(statsSection).toBeInTheDocument();
  });

  it("renders manage cards section with correct spacing", () => {
    const { container } = render(<AdminDashboard />);
    const manageSections = container.querySelectorAll(".flex.gap-4.mt-6.px-6");
    expect(manageSections.length).toBeGreaterThan(0);
  });

  it("navigates to competitions page when Manage Competitions card is clicked", () => {
    render(<AdminDashboard />);
    const manageCards = screen.getAllByTestId("manage-card");
    
    // The second manage card is "Manage Competitions" (wrapped in onClick div)
    const manageCompetitionsCard = manageCards[1];
    fireEvent.click(manageCompetitionsCard);
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/competitions');
  });

  it("Manage Competitions card has cursor-pointer class", () => {
    const { container } = render(<AdminDashboard />);
    const clickableDiv = container.querySelector('.cursor-pointer');
    expect(clickableDiv).toBeInTheDocument();
  });
});