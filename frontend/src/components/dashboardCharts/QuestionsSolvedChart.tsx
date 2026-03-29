import { useMemo } from "react";
import { PieChart, Pie, Cell, Label } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChartSkeleton } from "./DashboardChartSkeleton";
import type {
  CenterLabelProps,
  QuestionsSolvedChartProps,
  QuestionsSolvedData,
} from "@/types/adminDashboard/DashboardCharts.type";

const DIFFICULTY_COLORS = {
  Easy: "#10b981",
  Medium: "#f59e0b",
  Hard: "#ef4444",
} as const;

const CHART_CONFIG = {
  Easy: { color: DIFFICULTY_COLORS.Easy },
  Medium: { color: DIFFICULTY_COLORS.Medium },
  Hard: { color: DIFFICULTY_COLORS.Hard },
} as const;

const PLACEHOLDER_DATA: QuestionsSolvedData[] = [
  { name: "Easy", value: 1, color: DIFFICULTY_COLORS.Easy },
  { name: "Medium", value: 1, color: DIFFICULTY_COLORS.Medium },
  { name: "Hard", value: 1, color: DIFFICULTY_COLORS.Hard },
];

function getDifficultyColor(name: string): string {
  switch (name.toLowerCase()) {
    case "easy":
      return DIFFICULTY_COLORS.Easy;
    case "medium":
      return DIFFICULTY_COLORS.Medium;
    case "hard":
      return DIFFICULTY_COLORS.Hard;
    default:
      return DIFFICULTY_COLORS.Hard;
  }
}

function CenterLabel({ totalQuestions, viewBox }: Readonly<CenterLabelProps>) {
  if (!viewBox || typeof viewBox.cx !== "number" || typeof viewBox.cy !== "number") {
    return null;
  }

  return (
    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
      <tspan
        x={viewBox.cx}
        y={viewBox.cy}
        className="fill-foreground text-3xl font-bold"
      >
        {totalQuestions.toLocaleString()}
      </tspan>
      <tspan
        x={viewBox.cx}
        y={viewBox.cy + 24}
        className="fill-muted-foreground text-sm"
      >
        Questions
      </tspan>
    </text>
  );
}

export const QuestionsSolvedChart = ({
  data,
  loading = false,
}: QuestionsSolvedChartProps) => {
  if (loading) {
    return <PieChartSkeleton />;
  }

  const hasData = data.length > 0;
  
  // Calculate total questions from actual data
  const totalQuestions = useMemo(() => {
    if (!hasData) return 0;
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data, hasData]);

  // Use placeholder data if no data or total is 0
  const chartData = hasData && totalQuestions > 0 ? data : PLACEHOLDER_DATA;

  const resolvedData = chartData.map((entry) => ({
    ...entry,
    color: getDifficultyColor(entry.name),
  }));

  return (
    <ChartContainer
      config={CHART_CONFIG}
      style={{ width: "100%", height: 180 }}
    >
      <PieChart>
        <Pie
          data={resolvedData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={0}
          dataKey="value"
        >
          {resolvedData.map((entry) => (
            <Cell
              key={`${entry.name}-${entry.value}`}
              fill={entry.color}
            />
          ))}
          <Label content={<CenterLabel totalQuestions={totalQuestions} />} />
        </Pie>
        {totalQuestions > 0 && <ChartTooltip content={<ChartTooltipContent />} />}
      </PieChart>
    </ChartContainer>
  );
};

export default QuestionsSolvedChart;
