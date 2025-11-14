import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminDashboard from "../src/components/dashboard/AdminDashboard";

// 🧩 Mock child components so we isolate AdminDashboard behavior
jest.mock("@/components/dashboard/StatsCard", () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid="stats-card">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

jest.mock("@/components/dashboard/ManageCard", () => ({
  ManageCard: ({ title }: { title: string }) => (
    <div data-testid="manage-card">{title}</div>
  ),
}));

jest.mock("@/components/dashboard/TechnicalIssuesChart", () => ({
  TechnicalIssuesChart: () => <div data-testid="technical-issues-chart" />,
}));

jest.mock("@/components/dashboard/CreateCompetitionDialog", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (
    <div data-testid="create-dialog">{open ? "open" : "closed"}</div>
  ),
}));

// 🧭 Helper wrapper for Router context
const renderWithRouter = () =>
  render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );

describe("AdminDashboard", () => {
  it("renders the page header and button", () => {
    renderWithRouter();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create competition/i })
    ).toBeInTheDocument();
  });

  it("renders all StatsCard components", () => {
    renderWithRouter();
    const cards = screen.getAllByTestId("stats-card");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("New Accounts");
  });

  it("renders ManageCards for Accounts, Competitions, and Questions", () => {
    renderWithRouter();
    const manageCards = screen.getAllByTestId("manage-card");
    expect(manageCards).toHaveLength(3);
    expect(manageCards[0]).toHaveTextContent("Manage Accounts");
    expect(manageCards[1]).toHaveTextContent("Manage Competitions");
    expect(manageCards[2]).toHaveTextContent("Manage Questions");
  });

  it("renders TechnicalIssuesChart", () => {
    renderWithRouter();
    expect(screen.getByTestId("technical-issues-chart")).toBeInTheDocument();
  });

  it("renders CreateCompetitionDialog initially closed", () => {
    renderWithRouter();
    expect(screen.getByTestId("create-dialog")).toHaveTextContent("closed");
  });

  it("opens CreateCompetitionDialog after clicking the button", () => {
    renderWithRouter();
    const button = screen.getByRole("button", { name: /create competition/i });
    fireEvent.click(button);
    expect(screen.getByTestId("create-dialog")).toHaveTextContent("open");
  });
});
