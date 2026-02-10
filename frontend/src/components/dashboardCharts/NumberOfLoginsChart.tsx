import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { LoginsDataPoint } from "@/types/adminDashboard/Analytics.type";
import type { NumberOfLoginsChartProps } from "@/types/adminDashboard/DashboardCharts.type";

const LOGIN_LINE_COLOR = "var(--chart-2)";
const LOGIN_DOT_COLOR = "var(--chart-3)";
const PLACEHOLDER_DATA: LoginsDataPoint[] = [
  { month: "Mon", logins: 0 },
  { month: "Tue", logins: 0 },
  { month: "Wed", logins: 0 },
  { month: "Thu", logins: 0 },
  { month: "Fri", logins: 0 },
  { month: "Sat", logins: 0 },
  { month: "Sun", logins: 0 },
];

export const NumberOfLoginsChart = ({ data, loading = false }: NumberOfLoginsChartProps) => {
  const displayData = data.length > 0 ? data : PLACEHOLDER_DATA;

  return (
    <ChartContainer
      config={{ logins: { color: LOGIN_LINE_COLOR } }}
      style={{ width: "100%", height: 180, opacity: loading ? 0.5 : 1 }}
    >
      <LineChart
        data={displayData}
        margin={{ top: 5, right: 15, left: -35, bottom: 0 }}
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
          stroke={LOGIN_LINE_COLOR}
          strokeWidth={2}
          dot={{ fill: LOGIN_DOT_COLOR, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
};

export default NumberOfLoginsChart;
