import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type TimeRange = "3months" | "30days" | "7days";

export const NumberOfLoginsChart = ({ timeRange }: { timeRange: TimeRange }) => {
  const dataMap = {
    "3months": [
      { month: "Jan", logins: 166 },
      { month: "Feb", logins: 305 },
      { month: "Mar", logins: 237 },
      { month: "Apr", logins: 73 },
      { month: "May", logins: 209 },
      { month: "Jun", logins: 234 },
    ],
    "30days": [
      { month: "Week 1", logins: 285 },
      { month: "Week 2", logins: 310 },
      { month: "Week 3", logins: 195 },
      { month: "Week 4", logins: 265 },
    ],
    "7days": [
      { month: "Mon", logins: 45 },
      { month: "Tue", logins: 52 },
      { month: "Wed", logins: 48 },
      { month: "Thu", logins: 55 },
      { month: "Fri", logins: 62 },
      { month: "Sat", logins: 38 },
      { month: "Sun", logins: 35 },
    ],
  };

  const data = dataMap[timeRange];

  return (
    <ChartContainer config={{ logins: { color: "var(--chart-2)" } }} style={{ width: "100%", height: 180 }}>
      <LineChart
        data={data}
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
