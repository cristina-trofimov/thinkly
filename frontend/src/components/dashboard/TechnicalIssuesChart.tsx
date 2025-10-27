import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const chartData = [
  { month: "January", issues: 2 },
  { month: "February", issues: 7 },
  { month: "March", issues: 4 },
  { month: "April", issues: 6 },
  { month: "May", issues: 3.5 },
  { month: "June", issues: 4.2 },
];

const chartConfig = {
  issues: { label: "Issues", color: "#8065CD" },
} satisfies ChartConfig;

export const TechnicalIssuesChart = () => {
  return (
    <div className="w-full mt-14 pl-12 pr-12">
      <h2 className="text-left text-lg font-semibold text-[#0A0A0A]">Technical Issues</h2>
      <p className="text-left text-sm font-normal text-[#737373] mt-1 mb-8">
        Showing the amount of technical issues that arose to-date
      </p>

      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="issuesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="40%" stopColor="var(--color-issues)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-issues)" stopOpacity={0.06} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="#EFEFEF" />

          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fill: "#8C8C8C", fontSize: 14 }}
            tickFormatter={(v: string) => v.slice(0, 3)}
            padding={{ left: 0, right: 0 }}
            allowDuplicatedCategory={false}
          />

          <YAxis axisLine={false} tickLine={false} tick={false} width={0} domain={[0, "auto"]} />

          <ReferenceLine y={0} stroke="var(--color-issues)" strokeWidth={2} strokeLinecap="square" />

          <Area
            type="monotone"
            dataKey="issues"
            stroke="var(--color-issues)"
            strokeWidth={2}
            fill="url(#issuesFill)"
            dot={false}
            activeDot={false}
            connectNulls
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
};