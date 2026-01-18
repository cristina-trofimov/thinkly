import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface LoginsData {
  month: string;
  logins: number;
}

interface NumberOfLoginsChartProps {
  data: LoginsData[];
  loading?: boolean;
}

export const NumberOfLoginsChart = ({ data, loading = false }: NumberOfLoginsChartProps) => {
  // Show placeholder if loading or no data
  const displayData = data.length > 0 ? data : [
    { month: "Mon", logins: 0 },
    { month: "Tue", logins: 0 },
    { month: "Wed", logins: 0 },
    { month: "Thu", logins: 0 },
    { month: "Fri", logins: 0 },
    { month: "Sat", logins: 0 },
    { month: "Sun", logins: 0 },
  ];

  return (
    <ChartContainer
      config={{ logins: { color: "var(--chart-2)" } }}
      style={{ width: "100%", height: 180, opacity: loading ? 0.5 : 1 }}
    >
      <LineChart
        data={displayData}
        margin={{ top: 0, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          stroke="var(--color-muted-foreground)"
          tick={{ fontSize: 12 }}
        />
        <YAxis stroke="var(--color-muted-foreground)" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="logins"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={{ fill: "var(--chart-3)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
};

export default NumberOfLoginsChart;
