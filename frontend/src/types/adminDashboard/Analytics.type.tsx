// Types for Analytics charts in Admin Dashboard

export type TimeRange = "7days" | "30days" | "3months";

// Stats card
export interface NewAccountsStats {
  value: number;
  subtitle: string;
  trend: string;
  description: string;
}

// Pie chart - Questions solved by difficulty
export interface QuestionsSolvedItem {
  name: string;
  value: number;
  color: string;
}

// Bar chart - Time to solve by difficulty
export interface TimeToSolveItem {
  type: string;
  time: number;
  color: string;
}

// Line chart - Logins over time
export interface LoginsDataPoint {
  month: string;
  logins: number;
}

// Bar chart - Participation over time
export interface ParticipationDataPoint {
  date: string;
  participation: number;
}
