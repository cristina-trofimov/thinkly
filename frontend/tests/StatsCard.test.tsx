import { render, screen } from "@testing-library/react";
import { StatsCard } from "../src/components/dashboard/StatsCard";

// Mock shadcn components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

// Mock tabler icons
jest.mock("@tabler/icons-react", () => ({
  IconTrendingUp: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trending-up" className={className} />
  ),
  IconTrendingDown: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trending-down" className={className} />
  ),
}));

describe("StatsCard", () => {
  const defaultProps = {
    title: "Test Title",
    value: "100",
    description: "Test Description",
  };

  describe("Metric card mode (without children)", () => {
    it("renders with required props", () => {
      render(<StatsCard {...defaultProps} />);
      
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });

    it("renders with numeric value", () => {
      render(<StatsCard {...defaultProps} value={42} />);
      
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders subtitle when provided", () => {
      render(<StatsCard {...defaultProps} subtitle="Up 10% this year" />);
      
      expect(screen.getByText("Up 10% this year")).toBeInTheDocument();
    });

    it("does not render subtitle when not provided", () => {
      render(<StatsCard {...defaultProps} />);
      
      expect(screen.queryByText("Up 10% this year")).not.toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      render(<StatsCard title="Test Title" value="100" />);
      
      expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
    });

    describe("Trend indicator", () => {
      it("renders positive trend with IconTrendingUp", () => {
        render(<StatsCard {...defaultProps} trend="+10%" />);
        
        expect(screen.getByText("+10%")).toBeInTheDocument();
        const trendIcons = screen.getAllByTestId("icon-trending-up");
        expect(trendIcons.length).toBeGreaterThan(0);
      });

      it("renders negative trend with IconTrendingDown", () => {
        render(<StatsCard {...defaultProps} trend="-5%" />);
        
        expect(screen.getByText("-5%")).toBeInTheDocument();
        const trendIcons = screen.getAllByTestId("icon-trending-down");
        expect(trendIcons.length).toBeGreaterThan(0);
      });

      it("does not render trend when not provided", () => {
        render(<StatsCard {...defaultProps} />);
        
        expect(screen.queryByText("+10%")).not.toBeInTheDocument();
        expect(screen.queryByTestId("icon-trending-up")).not.toBeInTheDocument();
      });

      it("treats empty string trend as positive", () => {
        render(<StatsCard {...defaultProps} trend="  " />);
        
        const trendIcons = screen.queryAllByTestId("icon-trending-up");
        expect(trendIcons.length).toBeGreaterThan(0);
      });
    });

    describe("Subtitle with trend icon", () => {
      it("renders trending up icon in subtitle for positive trend", () => {
        render(<StatsCard {...defaultProps} subtitle="Up this year" trend="+10%" />);
        
        expect(screen.getByText("Up this year")).toBeInTheDocument();
        const trendIcons = screen.getAllByTestId("icon-trending-up");
        expect(trendIcons.length).toBeGreaterThan(0);
      });

      it("renders trending down icon in subtitle for negative trend", () => {
        render(<StatsCard {...defaultProps} subtitle="Down this year" trend="-5%" />);
        
        expect(screen.getByText("Down this year")).toBeInTheDocument();
        const trendIcons = screen.getAllByTestId("icon-trending-down");
        expect(trendIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Chart card mode (with children)", () => {
    it("renders children when provided", () => {
      render(
        <StatsCard title="Chart Title">
          <div data-testid="chart-content">Chart Component</div>
        </StatsCard>
      );
      
      expect(screen.getByText("Chart Title")).toBeInTheDocument();
      expect(screen.getByTestId("chart-content")).toBeInTheDocument();
      expect(screen.getByText("Chart Component")).toBeInTheDocument();
    });

    it("renders dateSubtitle when provided with children", () => {
      render(
        <StatsCard title="Chart Title" dateSubtitle="January - June 2025">
          <div>Chart</div>
        </StatsCard>
      );
      
      expect(screen.getByText("January - June 2025")).toBeInTheDocument();
    });

    it("does not render dateSubtitle when not provided", () => {
      render(
        <StatsCard title="Chart Title">
          <div>Chart</div>
        </StatsCard>
      );
      
      expect(screen.queryByText("January - June 2025")).not.toBeInTheDocument();
    });

    it("does not render value, subtitle, description in chart mode", () => {
      render(
        <StatsCard 
          title="Chart Title" 
          value="100"
          subtitle="Test Subtitle"
          description="Test Description"
        >
          <div>Chart</div>
        </StatsCard>
      );
      
      expect(screen.queryByText("100")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Subtitle")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
    });

    it("applies center alignment for chart card", () => {
      const { container } = render(
        <StatsCard title="Chart Title">
          <div>Chart</div>
        </StatsCard>
      );
      
      const cardTitle = container.querySelector('[data-testid="card-title"]');
      expect(cardTitle).toHaveClass("text-center");
    });
  });

  describe("Custom className", () => {
    it("applies custom className when provided", () => {
      const { container } = render(<StatsCard {...defaultProps} className="custom-class" />);
      
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass("custom-class");
    });
  });

  describe("Layout structure", () => {
    it("renders Card wrapper", () => {
      render(<StatsCard {...defaultProps} />);
      
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("renders CardHeader with title", () => {
      render(<StatsCard {...defaultProps} />);
      
      expect(screen.getByTestId("card-header")).toBeInTheDocument();
    });

    it("renders CardContent with value and description", () => {
      render(<StatsCard {...defaultProps} />);
      
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });
  });
});