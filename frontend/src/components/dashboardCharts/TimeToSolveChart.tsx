import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface TimeToSolveData {
  type: string;
  time: number;
  color: string;
}

interface TimeToSolveChartProps {
  data: TimeToSolveData[];
  loading?: boolean;
}

export const TimeToSolveChart = ({ data, loading = false }: TimeToSolveChartProps) => {
  // Show placeholder if loading or no data
  const displayData = data.length > 0 ? data : [
    { type: "Easy", time: 0, color: "var(--chart-1)" },
    { type: "Medium", time: 0, color: "var(--chart-2)" },
    { type: "Hard", time: 0, color: "var(--chart-3)" },
  ];

  return (
    <ChartContainer
      config={{
        Easy: { color: "var(--chart-1)" },
        Medium: { color: "var(--chart-2)" },
        Hard: { color: "var(--chart-3)" },
      }}
      style={{ width: "100%", height: 180, opacity: loading ? 0.5 : 1 }}
    >
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 0, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
        <XAxis type="number" stroke="var(--color-muted-foreground)" />
        <YAxis
          type="category"
          dataKey="type"
          stroke="var(--color-muted-foreground)"
          width={100}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="time" radius={[0, 4, 4, 0]}>
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export default TimeToSolveChart;
