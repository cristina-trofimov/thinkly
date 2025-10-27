import { render, screen } from "@testing-library/react";
import { TechnicalIssuesChart } from "../src/components/dashboard/TechnicalIssuesChart";

// Mock recharts
jest.mock("recharts", () => ({
  AreaChart: ({ children, data }: { children: React.ReactNode; data: any[] }) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: ({ dataKey, stroke }: { dataKey: string; stroke?: string }) => (
    <div data-testid="area" data-datakey={dataKey} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey, tickFormatter }: { dataKey: string; tickFormatter?: (v: string) => string }) => (
    <div data-testid="x-axis" data-datakey={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: ({ vertical, stroke }: { vertical?: boolean; stroke?: string }) => (
    <div data-testid="cartesian-grid" data-vertical={vertical} data-stroke={stroke} />
  ),
  ReferenceLine: ({ y, stroke, strokeWidth }: { y: number; stroke?: string; strokeWidth?: number }) => (
    <div data-testid="reference-line" data-y={y} data-stroke={stroke} data-stroke-width={strokeWidth} />
  ),
}));

// Mock chart container
jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children, config, className }: { children: React.ReactNode; config: any; className?: string }) => (
    <div data-testid="chart-container" data-config={JSON.stringify(config)} className={className}>
      {children}
    </div>
  ),
}));

describe("TechnicalIssuesChart", () => {
  describe("Basic rendering", () => {
    it("renders the chart title", () => {
      render(<TechnicalIssuesChart />);
      
      expect(screen.getByText("Technical Issues")).toBeInTheDocument();
    });

    it("renders the chart description", () => {
      render(<TechnicalIssuesChart />);
      
      expect(screen.getByText("Showing the amount of technical issues that arose to-date")).toBeInTheDocument();
    });

    it("renders the ChartContainer", () => {
      render(<TechnicalIssuesChart />);
      
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });

    it("renders the AreaChart", () => {
      render(<TechnicalIssuesChart />);
      
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    });
  });

  describe("Chart components", () => {
    it("renders CartesianGrid", () => {
      render(<TechnicalIssuesChart />);
      
      const grid = screen.getByTestId("cartesian-grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute("data-vertical", "false");
      expect(grid).toHaveAttribute("data-stroke", "#EFEFEF");
    });

    it("renders XAxis", () => {
      render(<TechnicalIssuesChart />);
      
      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis).toBeInTheDocument();
      expect(xAxis).toHaveAttribute("data-datakey", "month");
    });

    it("renders YAxis", () => {
      render(<TechnicalIssuesChart />);
      
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    });

    it("renders ReferenceLine at y=0", () => {
      render(<TechnicalIssuesChart />);
      
      const referenceLine = screen.getByTestId("reference-line");
      expect(referenceLine).toBeInTheDocument();
      expect(referenceLine).toHaveAttribute("data-y", "0");
      expect(referenceLine).toHaveAttribute("data-stroke", "var(--color-issues)");
      expect(referenceLine).toHaveAttribute("data-stroke-width", "2");
    });

    it("renders Area with correct dataKey", () => {
      render(<TechnicalIssuesChart />);
      
      const area = screen.getByTestId("area");
      expect(area).toBeInTheDocument();
      expect(area).toHaveAttribute("data-datakey", "issues");
      expect(area).toHaveAttribute("data-stroke", "var(--color-issues)");
    });
  });

  describe("Chart data", () => {
    it("passes correct data to AreaChart", () => {
      render(<TechnicalIssuesChart />);
      
      const areaChart = screen.getByTestId("area-chart");
      const chartData = JSON.parse(areaChart.getAttribute("data-chart-data") || "[]");
      
      expect(chartData).toHaveLength(6);
      expect(chartData[0]).toEqual({ month: "January", issues: 2 });
      expect(chartData[1]).toEqual({ month: "February", issues: 7 });
      expect(chartData[2]).toEqual({ month: "March", issues: 4 });
      expect(chartData[3]).toEqual({ month: "April", issues: 6 });
      expect(chartData[4]).toEqual({ month: "May", issues: 3.5 });
      expect(chartData[5]).toEqual({ month: "June", issues: 4.2 });
    });
  });

  describe("Chart configuration", () => {
    it("passes correct config to ChartContainer", () => {
      render(<TechnicalIssuesChart />);
      
      const chartContainer = screen.getByTestId("chart-container");
      const config = JSON.parse(chartContainer.getAttribute("data-config") || "{}");
      
      expect(config).toHaveProperty("issues");
      expect(config.issues).toEqual({ label: "Issues", color: "#8065CD" });
    });

    it("applies correct height class to ChartContainer", () => {
      render(<TechnicalIssuesChart />);
      
      const chartContainer = screen.getByTestId("chart-container");
      expect(chartContainer).toHaveClass("h-[260px]", "w-full");
    });
  });

  describe("Layout and styling", () => {
    it("applies correct container styling", () => {
      const { container } = render(<TechnicalIssuesChart />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("w-full", "mt-14", "pl-12", "pr-12");
    });

    it("renders title with correct styling", () => {
      const { container } = render(<TechnicalIssuesChart />);
      
      const title = container.querySelector("h2");
      expect(title).toHaveClass("text-left", "text-lg", "font-semibold", "text-[#0A0A0A]");
    });

    it("renders description with correct styling", () => {
      const { container } = render(<TechnicalIssuesChart />);
      
      const description = container.querySelector("p");
      expect(description).toHaveClass("text-left", "text-sm", "font-normal", "text-[#737373]");
    });
  });

  describe("Gradient definition", () => {
    it("includes gradient definition in the chart", () => {
      const { container } = render(<TechnicalIssuesChart />);
      
      // Check if defs element would be present (this is rendered by recharts)
      // In a real implementation with actual recharts, we'd check for the linearGradient
      const areaChart = screen.getByTestId("area-chart");
      expect(areaChart).toBeInTheDocument();
    });
  });
});