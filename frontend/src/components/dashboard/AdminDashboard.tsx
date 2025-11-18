import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { ManageCard } from "./ManageCard";
import { QuestionsSolvedChart, TimeToSolveChart, NumberOfLoginsChart, ParticipationOverTimeChart } from "./DashboardCharts";

export function AdminDashboard() {
  const location = useLocation();
  const [timeRange, setTimeRange] = useState<"3months" | "30days" | "7days">("3months");

  const isRootDashboard =
    location.pathname === "/app/dashboard" ||
    location.pathname === "/app/dashboard/";

  // HARDCODED STATS DATA - to be replaced with real data fetching logic    
  const getNewAccountsStats = (range: string) => {
    switch (range) {
      case "7days":
        return {
          value: 8,
          subtitle: "Up 12% in the last 7 days",
          trend: "+12%",
          description: "More users are joining Thinkly",
        };
      case "30days":
        return {
          value: 20,
          subtitle: "Down 5% in the last 30 days",
          trend: "-5%",
          description: "Less users are joining Thinkly",
        };
      case "3months":
      default:
        return {
          value: 25,
          subtitle: "Up 10% in the last 3 months",
          trend: "+10%",
          description: "More users are joining Thinkly",
        };
    }
  };

  const newAccountStats = getNewAccountsStats(timeRange);

  return (
    <div className="flex flex-col w-full">
      {isRootDashboard ? (
        <>
          <div className="border-b border-[#E5E5E5] bg-white">
            <div className="flex justify-between items-center py-4 px-10">
              <h1 className="text-base font-semibold text-[#8065CD]">
                Overview
              </h1>
            </div>
          </div>

          {/* Management Cards Row */}
          <div className="flex gap-4 mt-6 px-6">
            <Link
              to="/app/dashboard/manageAccounts"
              className="cursor-pointer block"
            >
              <ManageCard
                title="Manage Accounts"
                items={[
                  {
                    avatarUrl: "../public/assets/user_avatar.jpg",
                    name: "shadcn",
                    info: "shadcn@vercel.com",
                  },
                  {
                    avatarUrl: "../public/assets/user_avatar.jpg",
                    name: "maxleiter",
                    info: "maxleiter@vercel.com",
                  },
                ]}
              />
            </Link>
            <Link
              to="/app/dashboard/competitions"
              className="cursor-pointer block"
            >
              <ManageCard
                title="Manage Competitions"
                items={[
                  { color: "#A52A56", name: "Comp1", info: "08/11/25" },
                  { color: "#F2D340", name: "Comp2", info: "06/12/25" },
                ]}
              />
            </Link>
            <ManageCard
              title="Manage Questions"
              items={[
                { name: "Q1", info: "Date added: 08/11/25" },
                { name: "Q2", info: "Date added: 06/12/25" },
              ]}
            />
          </div>

          <div className="mt-6 mx-6 bg-white rounded-2xl shadow-md p-6 border border-gray-200">

            {/* Time Range Filter */}
            <div className="flex justify-end gap-2 mt-6 px-6">
              <button
                onClick={() => setTimeRange("3months")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === "3months"
                  ? "bg-[#8065CD] text-white"
                  : "bg-[#F5F5F5] text-[#737373] hover:bg-[#E5E5E5]"
                  }`}
              >
                Last 3 months
              </button>
              <button
                onClick={() => setTimeRange("30days")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === "30days"
                  ? "bg-[#8065CD] text-white"
                  : "bg-[#F5F5F5] text-[#737373] hover:bg-[#E5E5E5]"
                  }`}
              >
                Last 30 days
              </button>
              <button
                onClick={() => setTimeRange("7days")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === "7days"
                  ? "bg-[#8065CD] text-white"
                  : "bg-[#F5F5F5] text-[#737373] hover:bg-[#E5E5E5]"
                  }`}
              >
                Last 7 days
              </button>
            </div>

            {/* Stats Cards Row - Metrics and Charts */}
            <div className="flex gap-4 mt-6 px-6">
              <StatsCard
                title="New Accounts"
                value={newAccountStats.value}
                subtitle={newAccountStats.subtitle}
                description={newAccountStats.description}
                trend={newAccountStats.trend}
              />

              <StatsCard
                title="Questions solved"
                dateSubtitle={
                  timeRange === "3months"
                    ? "January - June 2025"
                    : timeRange === "30days"
                      ? "Last 30 days"
                      : "Last 7 days"
                }
              >
                <QuestionsSolvedChart timeRange={timeRange} />
              </StatsCard>

              <StatsCard
                title="Time to solve per type of question"
              >
                <TimeToSolveChart timeRange={timeRange} />
              </StatsCard>

              <StatsCard
                title="Number of logins"
              >
                <NumberOfLoginsChart timeRange={timeRange} />
              </StatsCard>
            </div>

            <ParticipationOverTimeChart timeRange={timeRange} />
          </div>

        </>
      ) : (
        <div className="px-6 mt-6">
          <Outlet />
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;