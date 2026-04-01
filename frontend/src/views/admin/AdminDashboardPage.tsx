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
  const [overviewVisible, setOverviewVisible] = useState(false);

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
  const [statsLoading, setStatsLoading] = useState(true);
  const [participationLoading, setParticipationLoading] = useState(true);

  const {
    trackAdminDashboardViewed,
    trackAdminDashboardTabSwitched,
    trackAdminDashboardTimeRangeChanged,
    trackAdminManageCardClicked,
  } = useAnalytics();

  const isRootDashboard =
    location.pathname === "/app/dashboard" ||
    location.pathname === "/app/dashboard/";
  const sharedChartAnimationKey = `range-${timeRange}`;
  const participationChartAnimationKey = `participation-${timeRange}-${activeTab}`;

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

  // Fetch stats that depend only on the time range.
  useEffect(() => {
    async function fetchSharedStats() {
      setStatsLoading(true);
      try {
        const [accounts, questionsSolved, timeToSolve, logins] =
          await Promise.all([
            getNewAccountsStats(timeRange),
            getQuestionsSolvedStats(timeRange),
            getTimeToSolveStats(timeRange),
            getLoginsStats(timeRange),
          ]);

        setNewAccountStats(accounts);
        setQuestionsSolvedData(questionsSolved);
        setTimeToSolveData(timeToSolve);
        setLoginsData(logins);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setStatsLoading(false);
      }
    }

    if (isRootDashboard) {
      fetchSharedStats();
    }
  }, [timeRange, isRootDashboard]);

  // Fetch only the participation data when its controls change.
  useEffect(() => {
    async function fetchParticipation() {
      setParticipationLoading(true);
      try {
        const participation = await getParticipationStats(timeRange, activeTab);
        setParticipationData(participation);
      } catch (error) {
        console.error("Error fetching participation stats:", error);
      } finally {
        setParticipationLoading(false);
      }
    }

    if (isRootDashboard) {
      fetchParticipation();
    }
  }, [timeRange, activeTab, isRootDashboard]);

  useEffect(() => {
    if (!isRootDashboard) {
      setOverviewVisible(false);
      return;
    }

    setOverviewVisible(false);
    const frame = requestAnimationFrame(() => {
      setOverviewVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [isRootDashboard]);

  const sectionEnterClass = overviewVisible
    ? "translate-y-0 opacity-100"
    : "translate-y-2 opacity-0";

  return (
    <div className="flex flex-col w-full">
      {isRootDashboard ? (
        <div>
          <div className="border-b">
            <div className="flex justify-between items-center py-4 px-10">
              <h1 className="text-base font-semibold text-primary">Overview</h1>
            </div>
          </div>

          {/* Management Cards Row */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-6 px-6 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out ${sectionEnterClass}`}
          >
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
              to="/app/dashboard/manageQuestions"
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
            <div
              className={`mt-6 px-6 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out ${sectionEnterClass}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-left text-lg font-semibold text-foreground">Platform metrics</h2>
                  <p className="text-left text-sm font-normal text-muted-foreground mt-1">
                    Monitor platform growth, user activity, and problem-solving trends.
                  </p>
                </div>
                <div className="shrink-0">
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
            </div>

            {/* Stats Cards Row */}
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4 mt-6 px-6 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out ${sectionEnterClass}`}
            >
                <StatsCard
                  title="New Accounts"
                  loading={statsLoading}
                  contentReady={!statsLoading}
                  value={newAccountStats.value}
                  subtitle={newAccountStats.subtitle}
                  description={newAccountStats.description}
                trend={newAccountStats.trend}
              />
                <StatsCard
                  title="Questions solved"
                  contentReady={!statsLoading}
                  dateSubtitle={getTimeRangeLabel(timeRange)}
                >
                <QuestionsSolvedChart
                  key={`questions-${sharedChartAnimationKey}`}
                  data={questionsSolvedData}
                  loading={statsLoading}
                />
              </StatsCard>
                <StatsCard title="Avg. Question Solve Time" contentReady={!statsLoading}>
                  <TimeToSolveChart
                    key={`time-${sharedChartAnimationKey}`}
                    data={timeToSolveData}
                  loading={statsLoading}
                />
              </StatsCard>
                <StatsCard title="Number of logins" contentReady={!statsLoading}>
                  <NumberOfLoginsChart
                    key={`logins-${sharedChartAnimationKey}`}
                    data={loginsData}
                  loading={statsLoading}
                />
              </StatsCard>
            </div>

            <div
              className={`mt-6 px-6 pb-6 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out ${sectionEnterClass}`}
            >
              <div className="mb-4 flex items-center justify-start">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="h-10 rounded-xl border border-border/70 bg-muted p-1 backdrop-blur-sm">
                    <TabsTrigger
                      value="algotime"
                      className="min-w-30 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      Algotime
                    </TabsTrigger>
                    <TabsTrigger
                      value="competitions"
                      className="min-w-30 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      Competitions
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <ParticipationOverTimeChart
                key={participationChartAnimationKey}
                data={participationData}
                timeRange={timeRange}
                loading={participationLoading}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 mt-6">
          <Outlet />
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
