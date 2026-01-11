// Types for Admin Dashboard API responses

export type TimeRange = "7days" | "30days" | "3months";

// ManageCard item types
export interface RecentAccountItem {
  name: string;
  info: string; // email
  avatarUrl?: string;
}

export interface RecentCompetitionItem {
  name: string;
  info: string; // date formatted
  color: string;
}

export interface RecentQuestionItem {
  name: string;
  info: string; // date added
}

export interface RecentAlgoTimeSessionItem {
  name: string;
  info: string; // date added
}

// Overview response (combines all recent items)
export interface DashboardOverviewResponse {
  recent_accounts: RecentAccountItem[];
  recent_competitions: RecentCompetitionItem[];
  recent_questions: RecentQuestionItem[];
  recent_algotime_sessions: RecentAlgoTimeSessionItem[];
}

// Stats types
export interface NewAccountsStats {
  value: number;
  subtitle: string;
  trend: string;
  description: string;
}

export interface QuestionsSolvedItem {
  name: string; // Easy, Medium, Hard
  value: number;
  color: string;
}

export interface TimeToSolveItem {
  type: string; // Easy, Medium, Hard
  time: number; // average time in minutes
  color: string;
}

export interface LoginsDataPoint {
  month: string;
  logins: number;
}

export interface ParticipationDataPoint {
  date: string;
  participation: number;
}
