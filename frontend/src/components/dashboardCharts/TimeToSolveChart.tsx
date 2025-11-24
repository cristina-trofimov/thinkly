import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type TimeRange = "3months" | "30days" | "7days";

export const TimeToSolveChart = ({ timeRange }: { timeRange: TimeRange }) => {
  const dataMap = {
    "3months": [
      { type: "Easy", time: 45, color: "var(--chart-1)" },
      { type: "Medium", time: 30, color: "var(--chart-2)" },
      { type: "Hard", time: 90, color: "var(--chart-3)" },
    ],
    "30days": [
      { type: "Easy", time: 42, color: "var(--chart-1)" },
      { type: "Medium", time: 28, color: "var(--chart-2)" },
      { type: "Hard", time: 85, color: "var(--chart-3)" },
    ],
    "7days": [
      { type: "Easy", time: 40, color: "var(--chart-1)" },
      { type: "Medium", time: 25, color: "var(--chart-2)" },
      { type: "Hard", time: 80, color: "var(--chart-3)" },
    ],
  };

  const data = dataMap[timeRange];

  return (
    <ChartContainer
      config={{
        Easy: { color: "var(--chart-1)" },
        Medium: { color: "var(--chart-2)" },
        Hard: { color: "var(--chart-3)" },
      }}
      style={{ width: "100%", height: 180 }}
    >
      <BarChart
        data={data}
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
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export default TimeToSolveChart;
