import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type TimeRange = "3months" | "30days" | "7days";

export const ParticipationOverTimeChart = ({ timeRange }: { timeRange: TimeRange }) => {
  const generateData = () => {
    if (timeRange === "7days") {
      return [
        { date: "Mon", participation: 52 },
        { date: "Tue", participation: 48 },
        { date: "Wed", participation: 65 },
        { date: "Thu", participation: 58 },
        { date: "Fri", participation: 72 },
        { date: "Sat", participation: 45 },
        { date: "Sun", participation: 38 },
      ];
    } else if (timeRange === "30days") {
      const data: Array<{ date: string; participation: number }> = [];
      for (let i = 1; i <= 30; i++) {
        data.push({
          date: `Day ${i}`,
          participation: Math.floor(Math.random() * 50) + 30,
        });
      }
      return data;
    } else {
      // 3 months data
      return [
        { date: "Apr 3", participation: 50 },
        { date: "Apr 4", participation: 35 },
        { date: "Apr 5", participation: 45 },
        { date: "Apr 6", participation: 55 },
        { date: "Apr 7", participation: 48 },
        { date: "Apr 8", participation: 60 },
        { date: "Apr 9", participation: 45 },
        { date: "Apr 10", participation: 52 },
        { date: "Apr 11", participation: 48 },
        { date: "Apr 12", participation: 42 },
        { date: "Apr 13", participation: 58 },
        { date: "Apr 14", participation: 38 },
        { date: "Apr 15", participation: 35 },
        { date: "Apr 16", participation: 70 },
        { date: "Apr 17", participation: 55 },
        { date: "Apr 18", participation: 48 },
        { date: "Apr 19", participation: 32 },
        { date: "Apr 20", participation: 38 },
        { date: "Apr 21", participation: 30 },
        { date: "Apr 22", participation: 55 },
        { date: "Apr 23", participation: 42 },
        { date: "Apr 24", participation: 48 },
        { date: "Apr 25", participation: 38 },
        { date: "Apr 26", participation: 45 },
        { date: "Apr 27", participation: 58 },
        { date: "Apr 28", participation: 42 },
        { date: "Apr 29", participation: 38 },
        { date: "Apr 30", participation: 68 },
        { date: "May 1", participation: 45 },
        { date: "May 2", participation: 52 },
        { date: "May 3", participation: 58 },
        { date: "May 4", participation: 65 },
        { date: "May 5", participation: 55 },
        { date: "May 6", participation: 40 },
        { date: "May 7", participation: 48 },
        { date: "May 8", participation: 52 },
        { date: "May 9", participation: 45 },
        { date: "May 10", participation: 58 },
        { date: "May 11", participation: 38 },
        { date: "May 12", participation: 72 },
        { date: "May 13", participation: 68 },
        { date: "May 14", participation: 78 },
        { date: "May 15", participation: 52 },
        { date: "May 16", participation: 42 },
        { date: "May 17", participation: 38 },
        { date: "May 18", participation: 35 },
        { date: "May 19", participation: 42 },
        { date: "May 20", participation: 48 },
        { date: "May 21", participation: 55 },
        { date: "May 22", participation: 38 },
        { date: "May 23", participation: 52 },
        { date: "May 24", participation: 45 },
        { date: "May 25", participation: 62 },
        { date: "May 26", participation: 48 },
        { date: "May 27", participation: 42 },
        { date: "May 28", participation: 55 },
        { date: "May 29", participation: 38 },
        { date: "May 30", participation: 45 },
        { date: "Jun 1", participation: 65 },
        { date: "Jun 2", participation: 58 },
        { date: "Jun 3", participation: 42 },
        { date: "Jun 4", participation: 48 },
        { date: "Jun 5", participation: 52 },
        { date: "Jun 6", participation: 45 },
        { date: "Jun 7", participation: 55 },
        { date: "Jun 8", participation: 62 },
        { date: "Jun 9", participation: 48 },
        { date: "Jun 10", participation: 72 },
        { date: "Jun 11", participation: 58 },
        { date: "Jun 12", participation: 52 },
        { date: "Jun 13", participation: 48 },
        { date: "Jun 14", participation: 65 },
        { date: "Jun 15", participation: 55 },
        { date: "Jun 16", participation: 42 },
        { date: "Jun 17", participation: 58 },
        { date: "Jun 18", participation: 48 },
        { date: "Jun 19", participation: 68 },
        { date: "Jun 20", participation: 55 },
        { date: "Jun 21", participation: 45 },
        { date: "Jun 22", participation: 38 },
        { date: "Jun 23", participation: 42 },
        { date: "Jun 24", participation: 70 },
        { date: "Jun 25", participation: 65 },
        { date: "Jun 26", participation: 58 },
        { date: "Jun 27", participation: 52 },
        { date: "Jun 28", participation: 48 },
        { date: "Jun 29", participation: 68 },
      ];
    }
  };

  const data = generateData();
  const interval = timeRange === "7days" ? 0 : timeRange === "30days" ? 2 : 4;

  return (
    <div className="w-full mt-6 px-6">
      <h2 className="text-left text-lg font-semibold text-foreground">Participation over time</h2>
      <p className="text-left text-sm font-normal text-muted-foreground mt-1 mb-8">
        Number of users joining competitions or AlgoTime sessions each day
      </p>
      <ChartContainer config={{ participation: { color: "var(--chart-4)" } }} style={{ width: "100%", height: 200 }}>
        <BarChart
          data={data}
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

export default ParticipationOverTimeChart;
