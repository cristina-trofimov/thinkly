import axiosClient from "@/lib/axiosClient";
import type {
  TimeRange,
  DashboardOverviewResponse,
  NewAccountsStats,
  QuestionsSolvedItem,
  TimeToSolveItem,
  LoginsDataPoint,
  ParticipationDataPoint,
} from "@/types/adminDashboard/AdminDashboard.type";

/**
 * Get dashboard overview with 2 most recent items for each category
 * Requires admin authentication
 */
export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  try {
    const response = await axiosClient.get<DashboardOverviewResponse>(
      "/admin/dashboard/overview"
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching dashboard overview:", err);
    throw err;
  }
}

/**
 * Get new accounts statistics for the specified time range
 * Requires admin authentication
 */
export async function getNewAccountsStats(
  timeRange: TimeRange = "3months"
): Promise<NewAccountsStats> {
  try {
    const response = await axiosClient.get<NewAccountsStats>(
      `/admin/dashboard/stats/new-accounts`,
      { params: { time_range: timeRange } }
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching new accounts stats:", err);
    throw err;
  }
}

/**
 * Get questions solved by difficulty for the specified time range
 * Returns data for pie chart
 * Requires admin authentication
 */
export async function getQuestionsSolvedStats(
  timeRange: TimeRange = "3months"
): Promise<QuestionsSolvedItem[]> {
  try {
    const response = await axiosClient.get<QuestionsSolvedItem[]>(
      `/admin/dashboard/stats/questions-solved`,
      { params: { time_range: timeRange } }
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching questions solved stats:", err);
    throw err;
  }
}

/**
 * Get average time to solve questions by difficulty
 * Returns data for horizontal bar chart
 * Requires admin authentication
 */
export async function getTimeToSolveStats(
  timeRange: TimeRange = "3months"
): Promise<TimeToSolveItem[]> {
  try {
    const response = await axiosClient.get<TimeToSolveItem[]>(
      `/admin/dashboard/stats/time-to-solve`,
      { params: { time_range: timeRange } }
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching time to solve stats:", err);
    throw err;
  }
}

/**
 * Get login counts over time
 * Returns data for line chart
 * Requires admin authentication
 */
export async function getLoginsStats(
  timeRange: TimeRange = "3months"
): Promise<LoginsDataPoint[]> {
  try {
    const response = await axiosClient.get<LoginsDataPoint[]>(
      `/admin/dashboard/stats/logins`,
      { params: { time_range: timeRange } }
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching logins stats:", err);
    throw err;
  }
}

/**
 * Get participation over time
 * Returns data for bar chart
 * Requires admin authentication
 */
export async function getParticipationStats(
  timeRange: TimeRange = "3months"
): Promise<ParticipationDataPoint[]> {
  try {
    const response = await axiosClient.get<ParticipationDataPoint[]>(
      `/admin/dashboard/stats/participation`,
      { params: { time_range: timeRange } }
    );
    return response.data;
  } catch (err) {
    console.error("Error fetching participation stats:", err);
    throw err;
  }
}
