// Types for ManageCards in Admin Dashboard (recent items)

export interface RecentAccountItem {
  name: string;
  info: string;
  avatarUrl?: string;
}

export interface RecentCompetitionItem {
  name: string;
  info: string;
  color: string;
}

export interface RecentQuestionItem {
  name: string;
  info: string;
}

export interface RecentAlgoTimeSessionItem {
  name: string;
  info: string;
}

export interface DashboardOverviewResponse {
  recent_accounts: RecentAccountItem[];
  recent_competitions: RecentCompetitionItem[];
  recent_questions: RecentQuestionItem[];
  recent_algotime_sessions: RecentAlgoTimeSessionItem[];
}
