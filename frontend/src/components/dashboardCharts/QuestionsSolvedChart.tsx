import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type TimeRange = "3months" | "30days" | "7days";

export const QuestionsSolvedChart = ({ timeRange }: { timeRange: TimeRange }) => {
  const dataMap = {
    "3months": [
      { name: "Easy", value: 300, color: "var(--chart-1)" },
      { name: "Medium", value: 200, color: "var(--chart-2)" },
      { name: "Hard", value: 100, color: "var(--chart-3)" },
    ],
    "30days": [
      { name: "Easy", value: 120, color: "var(--chart-1)" },
      { name: "Medium", value: 80, color: "var(--chart-2)" },
      { name: "Hard", value: 40, color: "var(--chart-3)" },
    ],
    "7days": [
      { name: "Easy", value: 25, color: "var(--chart-1)" },
      { name: "Medium", value: 18, color: "var(--chart-2)" },
      { name: "Hard", value: 10, color: "var(--chart-3)" },
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
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={0}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
};

export default QuestionsSolvedChart;
