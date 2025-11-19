import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type TimeRange = "3months" | "30days" | "7days";

// Questions Solved Component
export const QuestionsSolvedChart = ({ timeRange }: { timeRange: TimeRange }) => {
  // Different data based on time range
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
    <ResponsiveContainer width="80%" height={180}>
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
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Time to Solve Chart Component
export const TimeToSolveChart = ({ timeRange }: { timeRange: TimeRange }) => {
  // Different data based on time range
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
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E5" />
        <XAxis type="number" stroke="#A3A3A3" />
        <YAxis 
          type="category" 
          dataKey="type" 
          stroke="#A3A3A3"
          width={100}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="time" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Number of Logins Chart Component
export const NumberOfLoginsChart = ({ timeRange }: { timeRange: TimeRange }) => {
  // Different data based on time range
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
    <ResponsiveContainer width="100%" height={180}>
      <LineChart
        data={data}
        margin={{ top: 0, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis 
          dataKey="month" 
          stroke="#A3A3A3"
          tick={{ fontSize: 12 }}
        />
        <YAxis stroke="#A3A3A3" />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="logins"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={{ fill: "var(--chart-3)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Participation Over Time Chart Component
export const ParticipationOverTimeChart = ({ timeRange }: { timeRange: TimeRange }) => {
  // Generate data based on time range
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
      const data = [];
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
      <h2 className="text-left text-lg font-semibold text-[#0A0A0A]">Participation over time</h2>
      <p className="text-left text-sm font-normal text-[#737373] mt-1 mb-8">
        Number of users joining competitions or AlgoTime sessions each day
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#A3A3A3"
            tick={{ fontSize: 10 }}
            interval={interval}
          />
          <YAxis hide />
          <Tooltip />
          <Bar dataKey="participation" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};