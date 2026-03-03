import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { StatsCard } from "../../components/dashboardCards/StatsCard";
import { ManageCard } from "../../components/dashboardCards/ManageCard";
import { QuestionsSolvedChart } from "@/components/dashboardCharts/QuestionsSolvedChart";
import { TimeToSolveChart } from "@/components/dashboardCharts/TimeToSolveChart";
import { NumberOfLoginsChart } from "@/components/dashboardCharts/NumberOfLoginsChart";
import { ParticipationOverTimeChart } from "@/components/dashboardCharts/ParticipationOverTimeChart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeRange } from "@/types/adminDashboard/Analytics.type";
import {
  getNewAccountsStats,
  getQuestionsSolvedStats,
  getTimeToSolveStats,
  getLoginsStats,
  getParticipationStats,
} from "@/api/AdminDashboardAPI";
import { FileText, Puzzle, Timer, Trophy, Users } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "3months": "Last 3 months",
  "30days": "Last 30 days",
  "7days": "Last 7 days",
};

function getTimeRangeLabel(timeRange: TimeRange): string {
  return TIME_RANGE_LABELS[timeRange];
}

export function AdminDashboard() {
  const location = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>("3months");
  const [activeTab, setActiveTab] = useState<"algotime" | "competitions">("algotime");

  const [newAccountStats, setNewAccountStats] = useState({
    value: 0,
    subtitle: "",
    trend: "",
    description: "",
  });
  const [questionsSolvedData, setQuestionsSolvedData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [timeToSolveData, setTimeToSolveData] = useState<
    { type: string; time: number; color: string }[]
  >([]);
  const [loginsData, setLoginsData] = useState<{ month: string; logins: number }[]>([]);
  const [participationData, setParticipationData] = useState<
    { date: string; participation: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const {
    trackAdminDashboardViewed,
    trackAdminDashboardTabSwitched,
    trackAdminDashboardTimeRangeChanged,
    trackAdminManageCardClicked,
  } = useAnalytics();

  const isRootDashboard =
    location.pathname === "/app/dashboard" ||
    location.pathname === "/app/dashboard/";
  const chartAnimationKey = `tab-${activeTab}`;

  // Track page view once when the overview is showing
  useEffect(() => {
    if (isRootDashboard) {
      trackAdminDashboardViewed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRootDashboard]);

  const handleTabChange = (value: string) => {
    const newTab = value as "algotime" | "competitions";
    setActiveTab(newTab);
    trackAdminDashboardTabSwitched(newTab);
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange);
    trackAdminDashboardTimeRangeChanged(value);
  };

  // Fetch stats data when timeRange or activeTab changes
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [accounts, questionsSolved, timeToSolve, logins, participation] =
          await Promise.all([
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
              <h1 className="text-base font-semibold text-primary">Overview</h1>
            </div>
          </div>

          {/* Management Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-6 px-6">
            <Link
              to="/app/dashboard/competitions"
              className="xl:col-start-1 xl:row-start-1"
              onClick={() => trackAdminManageCardClicked("competitions")}
            >
              <ManageCard title="Manage Competitions" icon={Trophy} />
            </Link>
            <Link
              to="/app/dashboard/algoTimeSessions"
              className="xl:col-start-1 xl:row-start-2"
              onClick={() => trackAdminManageCardClicked("algotime_sessions")}
            >
              <ManageCard title="Manage Algotime Sessions" icon={Timer} />
            </Link>
            <Link
              to="#"
              className="xl:col-start-2 xl:row-start-1"
              onClick={() => trackAdminManageCardClicked("questions")}
            >
              <ManageCard title="Manage Questions" icon={FileText} />
            </Link>
            <Link
              to="/app/dashboard/manageRiddles"
              className="xl:col-start-2 xl:row-start-2"
              onClick={() => trackAdminManageCardClicked("riddles")}
            >
              <ManageCard title="Manage Riddles" icon={Puzzle} />
            </Link>
            <Link
              to="/app/dashboard/manageAccounts"
              className="xl:col-start-3 xl:row-start-1"
              onClick={() => trackAdminManageCardClicked("accounts")}
            >
              <ManageCard title="Manage Accounts" icon={Users} />
            </Link>
          </div>

          <div className="m-6 rounded-lg shadow-md border">
            {/* Tabs for Algotime/Competitions and Time Range Filter */}
            <div className="flex justify-between items-center gap-2 mt-6 px-6">
              <div className="flex items-center">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList>
                    <TabsTrigger
                      value="algotime"
                      className="rounded-md font-semibold text-muted-foreground p-4 transition-all duration-200 relative hover:text-primary data-[state=active]:text-primary"
                    >
                      Algotime
                    </TabsTrigger>
                    <TabsTrigger
                      value="competitions"
                      className="rounded-md font-semibold text-muted-foreground p-3 transition-all duration-200 relative hover:text-primary data-[state=active]:text-primary"
                    >
                      Competitions
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger className="text-primary rounded-lg">
                    <SelectValue
                      className="text-primary"
                      placeholder={getTimeRangeLabel(timeRange)}
                    />
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

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4 mt-6 px-6">
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
                <QuestionsSolvedChart
                  key={`questions-${chartAnimationKey}`}
                  data={questionsSolvedData}
                  loading={loading}
                />
              </StatsCard>
              <StatsCard title="Avg. Question Solve Time">
                <TimeToSolveChart
                  key={`time-${chartAnimationKey}`}
                  data={timeToSolveData}
                  loading={loading}
                />
              </StatsCard>
              <StatsCard title="Number of logins">
                <NumberOfLoginsChart
                  key={`logins-${chartAnimationKey}`}
                  data={loginsData}
                  loading={loading}
                />
              </StatsCard>
            </div>

            <ParticipationOverTimeChart
              key={`participation-${chartAnimationKey}`}
              data={participationData}
              timeRange={timeRange}
              loading={loading}
            />
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