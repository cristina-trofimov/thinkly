import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface QuestionsSolvedData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature for recharts compatibility
}

interface QuestionsSolvedChartProps {
  data: QuestionsSolvedData[];
  loading?: boolean;
}

export const QuestionsSolvedChart = ({ data, loading = false }: QuestionsSolvedChartProps) => {
  // Show empty state if loading or no data
  if (loading || data.length === 0) {
    const placeholderData: QuestionsSolvedData[] = [
      { name: "Easy", value: 1, color: "var(--chart-1)" },
      { name: "Medium", value: 1, color: "var(--chart-2)" },
      { name: "Hard", value: 1, color: "var(--chart-3)" },
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
        <PieChart>
          <Pie
            data={placeholderData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={0}
            dataKey="value"
          >
            {placeholderData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    );
  }

  // Add index signature to data for recharts compatibility
  const chartData: QuestionsSolvedData[] = data.map(item => ({
    ...item,
  }));

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
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={0}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
};

export default QuestionsSolvedChart;
