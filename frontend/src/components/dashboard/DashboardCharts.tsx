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