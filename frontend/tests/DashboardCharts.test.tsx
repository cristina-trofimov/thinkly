import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the project's Chart helpers (shadcn wrappers)
jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: ({ content }: any) => <div data-testid="chart-tooltip">{content}</div>,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content">Tooltip</div>,
}));

// Mock recharts primitives used by the charts. We provide simple testable wrappers
jest.mock("recharts", () => {
  const React = require("react");

  return {
    PieChart: ({ children }: any) => <div data-testid="piechart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: ({ fill }: any) => <div data-testid="pie-cell" data-fill={fill} />,
    LineChart: ({ children }: any) => <div data-testid="linechart">{children}</div>,
    Line: ({ children }: any) => <div data-testid="line">{children}</div>,
    XAxis: () => <div data-testid="x-axis" />, 
    YAxis: () => <div data-testid="y-axis" />, 
    CartesianGrid: () => <div data-testid="grid" />, 
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="barchart">{children}</div>,
    Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
  };
});

// Import the chart components under test (after mocks)
import {
  QuestionsSolvedChart,
  TimeToSolveChart,
  NumberOfLoginsChart,
  ParticipationOverTimeChart,
} from "../src/components/dashboard/DashboardCharts";

describe("DashboardCharts", () => {
  it("renders pie chart with cells for QuestionsSolvedChart", () => {
    render(<QuestionsSolvedChart timeRange="3months" />);

    // Expect chart container and pie to be rendered
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("piechart")).toBeInTheDocument();

    // There are three entries in the 3months dataset => 3 cells
    const cells = screen.getAllByTestId("pie-cell");
    expect(cells.length).toBe(3);
  });

  it("renders vertical bar chart for TimeToSolveChart with bar cells", () => {
    render(<TimeToSolveChart timeRange="3months" />);

    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("barchart")).toBeInTheDocument();

    // The mock Bar renders children (Cells) — expect at least one bar element
    expect(screen.getByTestId("bar")).toBeInTheDocument();
  });

  it("renders line chart for NumberOfLoginsChart and shows tooltip content", () => {
    render(<NumberOfLoginsChart timeRange="3months" />);

    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("linechart")).toBeInTheDocument();

    // ChartTooltip content should be rendered by our ChartTooltip mock
    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("chart-tooltip-content")).toBeInTheDocument();
  });

  it("renders participation over time bar chart", () => {
    render(<ParticipationOverTimeChart timeRange="7days" />);

    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("barchart")).toBeInTheDocument();
    expect(screen.getByTestId("bar")).toBeInTheDocument();
  });
});
