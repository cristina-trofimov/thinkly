import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { StatsCard } from "../../components/dashboardCards/StatsCard";
import { ManageCard } from "../../components/dashboardCards/ManageCard";
import { QuestionsSolvedChart } from "@/components/dashboardCharts/QuestionsSolvedChart";
import { TimeToSolveChart } from "@/components/dashboardCharts/TimeToSolveChart";
import { NumberOfLoginsChart } from "@/components/dashboardCharts/NumberOfLoginsChart";
import { ParticipationOverTimeChart } from "@/components/dashboardCharts/ParticipationOverTimeChart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ManageItem } from "../../components/dashboardCards/ManageCard";
import type { TimeRange } from "@/types/adminDashboard/Analytics.type";
import {
  getDashboardOverview,
  getNewAccountsStats,
  getQuestionsSolvedStats,
  getTimeToSolveStats,
  getLoginsStats,
  getParticipationStats,
} from "@/api/AdminDashboardAPI";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "3months": "Last 3 months",
  "30days": "Last 30 days",
  "7days": "Last 7 days",
};

function getTimeRangeLabel(timeRange: TimeRange): string {
  return TIME_RANGE_LABELS[timeRange];
}

function getLoadingPlaceholder(type: "account" | "competition" | "default"): ManageItem[] {
  if (type === "account") {
    return [{ avatarUrl: undefined, name: "Loading...", info: "" }];
  }
  if (type === "competition") {
    return [{ color: "var(--color-chart-1)", name: "Loading...", info: "" }];
  }
  return [{ name: "Loading...", info: "" }];
}

export function AdminDashboard() {
  const location = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>("3months");
  const [activeTab, setActiveTab] = useState<"algotime" | "competitions">("algotime");

  // State for API data
  const [recentAccounts, setRecentAccounts] = useState<ManageItem[]>([]);
  const [recentCompetitions, setRecentCompetitions] = useState<ManageItem[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<ManageItem[]>([]);
  const [recentAlgoTimeSessions, setRecentAlgoTimeSessions] = useState<ManageItem[]>([]);
  const [newAccountStats, setNewAccountStats] = useState({ value: 0, subtitle: "", trend: "", description: "" });
  const [questionsSolvedData, setQuestionsSolvedData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [timeToSolveData, setTimeToSolveData] = useState<{ type: string; time: number; color: string }[]>([]);
  const [loginsData, setLoginsData] = useState<{ month: string; logins: number }[]>([]);
  const [participationData, setParticipationData] = useState<{ date: string; participation: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const isRootDashboard =
    location.pathname === "/app/dashboard" ||
    location.pathname === "/app/dashboard/";

  // Fetch overview data on mount
  useEffect(() => {
    async function fetchOverview() {
      try {
        const overview = await getDashboardOverview();

        setRecentAccounts(
          overview.recent_accounts.map((acc) => ({
            name: acc.name,
            info: acc.info,
            avatarUrl: acc.avatarUrl || undefined,
          }))
        );

        setRecentCompetitions(
          overview.recent_competitions.map((comp) => ({
            name: comp.name,
            info: comp.info,
            color: comp.color,
          }))
        );

        setRecentQuestions(
          overview.recent_questions.map((q) => ({
            name: q.name,
            info: q.info,
          }))
        );

        setRecentAlgoTimeSessions(
          overview.recent_algotime_sessions.map((session) => ({
            name: session.name,
            info: session.info,
          }))
        );
      } catch (error) {
        console.error("Error fetching dashboard overview:", error);
      }
    }

    if (isRootDashboard) {
      fetchOverview();
    }
  }, [isRootDashboard]);

  // Fetch stats data when timeRange or activeTab changes
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [accounts, questionsSolved, timeToSolve, logins, participation] = await Promise.all([
          getNewAccountsStats(timeRange),
          getQuestionsSolvedStats(timeRange),
          getTimeToSolveStats(timeRange),
          getLoginsStats(timeRange),
          getParticipationStats(timeRange, activeTab),
        ]);

        setNewAccountStats(accounts);
        setQuestionsSolvedData(questionsSolved);
        setTimeToSolveData(timeToSolve);
        setLoginsData(logins);
        setParticipationData(participation);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isRootDashboard) {
      fetchStats();
    }
  }, [timeRange, activeTab, isRootDashboard]);

  return (
    <div className="flex flex-col w-full">
      {isRootDashboard ? (
        <>
          <div className="border-b">
            <div className="flex justify-between items-center py-4 px-10">
              <h1 className="text-base font-semibold text-primary">
                Overview
              </h1>
            </div>
          </div>

          {/* Management Cards Row */}
          <div className="flex gap-4 mt-6 px-6">
            <Link
              to="/app/dashboard/manageAccounts"
              className="cursor-pointer block flex-1 min-w-0"
            >
              <ManageCard
                title="Manage Accounts"
                items={recentAccounts.length > 0 ? recentAccounts : getLoadingPlaceholder("account")}
              />
            </Link>
            <Link
              to="/app/dashboard/competitions"
              className="cursor-pointer block flex-1 min-w-0"
            >
              <ManageCard
                title="Manage Competitions"
                items={recentCompetitions.length > 0 ? recentCompetitions : getLoadingPlaceholder("competition")}
              />
            </Link>
            <Link
              to="/app/dashboard/manageQuestions"
              className="cursor-pointer block flex-1 min-w-0"
            >  
              <div className="flex-1 min-w-0">
                <ManageCard
                  title="Manage Questions"
                  items={recentQuestions.length > 0 ? recentQuestions : getLoadingPlaceholder("default")}
                  />
              </div>
            </Link>
            <Link
              to="/app/dashboard/algoTimeSessions"
              className="cursor-pointer block flex-1 min-w-0"
            >
              <ManageCard
                title="Manage Algotime Sessions"
                items={recentAlgoTimeSessions.length > 0 ? recentAlgoTimeSessions : getLoadingPlaceholder("default")}
              />
            </Link>
            <Link
              to="/app/dashboard/manageRiddles"
              className="cursor-pointer block flex-1 min-w-0"
            >
              <ManageCard
                title="Manage Riddles"
                items={[
                  { name: "Riddle 1", info: "Date added: 08/11/25" },
                  { name: "Riddle 2", info: "Date added: 06/12/25" },
                ]}
              />
            </Link>
          </div>

          <div className="my-6 mx-6 rounded-2xl shadow-md border">

            {/* Tabs for Algotime/Competitions and Time Range Filter */}
            <div className="flex justify-between items-center gap-2 mt-6 px-6">
              <div className="flex items-center">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "algotime" | "competitions")}>
                  <TabsList className="space-x-1">
                    <TabsTrigger value="algotime" className="rounded-md text-primary">Algotime</TabsTrigger>
                    <TabsTrigger value="competitions" className="rounded-md text-primary">Competitions</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                  <SelectTrigger className="text-primary rounded-lg">
                    <SelectValue className="text-primary" placeholder={getTimeRangeLabel(timeRange)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Time range</SelectLabel>
                      <SelectItem value="3months">Last 3 months</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
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
                dateSubtitle={getTimeRangeLabel(timeRange)}
              >
                <QuestionsSolvedChart data={questionsSolvedData} loading={loading} />
              </StatsCard>

              <StatsCard
                title="Time to solve per type of question"
              >
                <TimeToSolveChart data={timeToSolveData} loading={loading} />
              </StatsCard>

              <StatsCard
                title="Number of logins"
              >
                <NumberOfLoginsChart data={loginsData} loading={loading} />
              </StatsCard>
            </div>

            <ParticipationOverTimeChart data={participationData} timeRange={timeRange} loading={loading} />
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
