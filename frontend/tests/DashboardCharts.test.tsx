import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children, style }: any) => (
    <div data-testid="chart-container" data-opacity={String(style?.opacity)}>
      {children}
    </div>
  ),
  ChartTooltip: ({ content }: any) => <div data-testid="chart-tooltip">{content}</div>,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content">Tooltip</div>,
}));

jest.mock("recharts", () => {
  const React = require("react");

  return {
    PieChart: ({ children }: any) => <div data-testid="piechart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Label: ({ content }: any) => (
      <div data-testid="pie-label">
        {React.isValidElement(content) ? React.cloneElement(content, {}) : null}
        {React.isValidElement(content)
          ? React.cloneElement(content, { viewBox: { cx: 100, cy: 100 } })
          : null}
      </div>
    ),
    Cell: ({ fill }: any) => <div data-testid="chart-cell" data-fill={fill} />,
    LineChart: ({ children, data }: any) => (
      <div data-testid="linechart" data-points={String(data?.length ?? 0)}>
        {children}
      </div>
    ),
    Line: () => <div data-testid="line" />,
    XAxis: ({ interval }: any) => (
      <div data-testid="x-axis" data-interval={interval === undefined ? "none" : String(interval)} />
    ),
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    BarChart: ({ children, data }: any) => (
      <div data-testid="barchart" data-points={String(data?.length ?? 0)}>
        {children}
      </div>
    ),
    Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
  };
});

import { QuestionsSolvedChart } from "../src/components/dashboardCharts/QuestionsSolvedChart";
import { TimeToSolveChart } from "../src/components/dashboardCharts/TimeToSolveChart";
import { NumberOfLoginsChart } from "../src/components/dashboardCharts/NumberOfLoginsChart";
import { ParticipationOverTimeChart } from "../src/components/dashboardCharts/ParticipationOverTimeChart";

describe("DashboardCharts", () => {
  it("renders QuestionsSolvedChart with mapped colors, center total, and tooltip when total is positive", () => {
    render(
      <QuestionsSolvedChart
        data={[
          { name: "easy", value: 2 },
          { name: "MEDIUM", value: 3 },
          { name: "Unknown", value: 1 },
        ]}
      />,
    );

    expect(screen.getByTestId("piechart")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Questions")).toBeInTheDocument();

    const fills = screen
      .getAllByTestId("chart-cell")
      .map((node) => node.getAttribute("data-fill"));
    expect(fills).toEqual(["#10b981", "#f59e0b", "#ef4444"]);

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("chart-tooltip-content")).toBeInTheDocument();
  });

  it("uses placeholder slices and hides tooltip when QuestionsSolvedChart has no usable data", () => {
    const { rerender } = render(<QuestionsSolvedChart data={[]} loading />);

    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-tooltip")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("chart-cell")).toHaveLength(0);

    rerender(
      <QuestionsSolvedChart
        data={[
          { name: "Easy", value: 0 },
          { name: "Medium", value: 0 },
        ]}
      />,
    );

    expect(screen.queryByTestId("chart-tooltip")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("chart-cell")).toHaveLength(3);
  });

  it("uses fallback data in NumberOfLoginsChart when data is empty and supports loading opacity", () => {
    render(<NumberOfLoginsChart data={[]} loading />);

    expect(screen.queryByTestId("linechart")).not.toBeInTheDocument();
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-tooltip")).not.toBeInTheDocument();
  });

  it("uses provided NumberOfLoginsChart data when available", () => {
    render(
      <NumberOfLoginsChart
        data={[
          { month: "Mon", logins: 10 },
          { month: "Tue", logins: 12 },
          { month: "Wed", logins: 8 },
        ]}
      />,
    );

    expect(screen.getByTestId("linechart")).toHaveAttribute("data-points", "3");
    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
  });

  it("renders TimeToSolveChart with fallback color for unknown type and placeholder fallback", () => {
    const { rerender } = render(
      <TimeToSolveChart
        data={[
          { type: "Easy", time: 5 },
          { type: "Custom", time: 10 },
        ]}
      />,
    );

    let cells = within(screen.getByTestId("bar"))
      .getAllByTestId("chart-cell")
      .map((node) => node.getAttribute("data-fill"));
    expect(cells).toEqual(["#10b981", "var(--chart-3)"]);

    rerender(<TimeToSolveChart data={[]} loading />);

    expect(screen.queryByTestId("barchart")).not.toBeInTheDocument();
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("uses 7days placeholder and interval 0 in ParticipationOverTimeChart", () => {
    render(<ParticipationOverTimeChart data={[]} timeRange="7days" loading />);

    expect(screen.getByText(/Participation over time/i)).toBeInTheDocument();
    expect(screen.queryByTestId("barchart")).not.toBeInTheDocument();
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("sets interval 2 for 30days and default interval 4 for 3months in ParticipationOverTimeChart", () => {
    const { rerender } = render(<ParticipationOverTimeChart data={[]} timeRange="30days" />);

    expect(screen.getByTestId("barchart")).toHaveAttribute("data-points", "30");
    expect(screen.getByTestId("x-axis")).toHaveAttribute("data-interval", "2");

    rerender(
      <ParticipationOverTimeChart
        data={[{ date: "Day 1", participation: 11 }]}
        timeRange="3months"
      />,
    );

    expect(screen.getByTestId("barchart")).toHaveAttribute("data-points", "1");
    expect(screen.getByTestId("x-axis")).toHaveAttribute("data-interval", "4");
  });

  it("switches the ParticipationOverTimeChart description based on selected event type", () => {
    const { rerender } = render(
      <ParticipationOverTimeChart data={[]} timeRange="3months" eventType="algotime" />
    );

    expect(screen.getByText("Number of users joining AlgoTime sessions each day")).toBeInTheDocument();

    rerender(
      <ParticipationOverTimeChart data={[]} timeRange="3months" eventType="competitions" />
    );

    expect(screen.getByText("Number of users joining competitions each day")).toBeInTheDocument();
  });
});
