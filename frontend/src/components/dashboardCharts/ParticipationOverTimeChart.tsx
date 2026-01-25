import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TimeRange } from "@/types/adminDashboard/Analytics.type";

interface ParticipationData {
  date: string;
  participation: number;
}

interface ParticipationOverTimeChartProps {
  data: ParticipationData[];
  timeRange: TimeRange;
  loading?: boolean;
}

export const ParticipationOverTimeChart = ({
  data,
  timeRange,
  loading = false,
}: ParticipationOverTimeChartProps) => {
  // Generate placeholder data if no data provided
  const displayData = data.length > 0 ? data : generatePlaceholderData(timeRange);

  const intervalMap: Record<string, number> = {
    "7days": 0,
    "30days": 2,
  };
  const interval = intervalMap[timeRange] ?? 4;

  return (
    <div className="w-full mt-6 px-6">
      <h2 className="text-left text-lg font-semibold text-foreground">Participation over time</h2>
      <p className="text-left text-sm font-normal text-muted-foreground mt-1 mb-8">
        Number of users joining competitions or AlgoTime sessions each day
      </p>
      <ChartContainer
        config={{ participation: { color: "var(--chart-4)" } }}
        style={{ width: "100%", height: 200, opacity: loading ? 0.5 : 1 }}
      >
        <BarChart
          data={displayData}
          margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 10 }}
            interval={interval}
          />
          <YAxis hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="participation" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

function generatePlaceholderData(timeRange: TimeRange): ParticipationData[] {
  if (timeRange === "7days") {
    return [
      { date: "Mon", participation: 0 },
      { date: "Tue", participation: 0 },
      { date: "Wed", participation: 0 },
      { date: "Thu", participation: 0 },
      { date: "Fri", participation: 0 },
      { date: "Sat", participation: 0 },
      { date: "Sun", participation: 0 },
    ];
  } else {
    // 3 months - just a few sample days
    return Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      participation: 0,
    }));
  }
}

export default ParticipationOverTimeChart;
