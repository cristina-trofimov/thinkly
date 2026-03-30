import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TimeToSolveChartProps, TimeToSolveData } from "@/types/adminDashboard/DashboardCharts.type";
import { HorizontalBarsSkeleton } from "./DashboardChartSkeleton";

const DIFFICULTY_COLORS = {
  Easy: "#10b981",
  Medium: "#f59e0b",
  Hard: "#ef4444",
} as const;

const PLACEHOLDER_DATA: TimeToSolveData[] = [
  { type: "Easy", time: 0 },
  { type: "Medium", time: 0 },
  { type: "Hard", time: 0 },
];

export const TimeToSolveChart = ({ data, loading = false }: TimeToSolveChartProps) => {
  if (loading) {
    return <HorizontalBarsSkeleton />;
  }

  const baseData = data.length > 0 ? data : PLACEHOLDER_DATA;

  const displayData = baseData.map((item) => ({
    ...item,
    color:
      DIFFICULTY_COLORS[item.type as keyof typeof DIFFICULTY_COLORS] ??
      "var(--chart-3)",
  }));

  return (
    <ChartContainer
      config={{
        Easy: { color: DIFFICULTY_COLORS.Easy },
        Medium: { color: DIFFICULTY_COLORS.Medium },
        Hard: { color: DIFFICULTY_COLORS.Hard },
      }}
      style={{ width: "100%", height: 180 }}
    >
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 0, right: 15, left: -5, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
        <XAxis type="number" stroke="var(--color-muted-foreground)" />
        <YAxis
          type="category"
          dataKey="type"
          stroke="var(--color-muted-foreground)"
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="time" radius={[0, 4, 4, 0]}>
          {displayData.map((entry) => (
            <Cell key={`${entry.type}-${entry.time}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export default TimeToSolveChart;
