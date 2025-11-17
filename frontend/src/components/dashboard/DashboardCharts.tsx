import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Questions Solved Component
export const QuestionsSolvedChart = () => {
  const data = [
    { name: "Easy", value: 300, color: "#9B85DB" },
    { name: "Medium", value: 200, color: "#8065CD" },
    { name: "Hard", value: 100, color: "#6B51BF" },
  ];

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
export const TimeToSolveChart = () => {
  const data = [
    { type: "Easy", time: 45, color: "#9B85DB" },
    { type: "Medium", time: 30, color: "#8065CD" },
    { type: "Hard", time: 90, color: "#6B51BF" },
  ];

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
export const NumberOfLoginsChart = () => {
  const data = [
    { month: "Jan", logins: 166 },
    { month: "Feb", logins: 305 },
    { month: "Mar", logins: 237 },
    { month: "Apr", logins: 73 },
    { month: "May", logins: 209 },
    { month: "Jun", logins: 234 },
  ];

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
          stroke="#9B85DB"
          strokeWidth={2}
          dot={{ fill: "#8065CD", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Participation Over Time Chart Component
export const ParticipationOverTimeChart = () => {
  // Generate daily data for ~3 months (Apr to Jun)
  const data = [
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
            interval={4}
          />
          <YAxis hide />
          <Tooltip />
          <Bar dataKey="participation" fill="#9B85DB" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};