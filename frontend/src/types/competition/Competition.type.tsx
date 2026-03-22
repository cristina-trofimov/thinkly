export interface Competition {
  id: number;
  competitionTitle: string;
  competitionLocation: string;
  startDate: Date;
  endDate: Date;
}

export type CompetitionStatusFilter = "active" | "upcoming" | "completed";

export interface CompetitionApiItem {
  id: number;
  competition_title: string;
  competition_location: string | null;
  start_date: string;
  end_date: string;
}

export interface CompetitionApiPage {
  total: number;
  page: number;
  page_size: number;
  items: CompetitionApiItem[];
}

export interface CompetitionsPageParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CompetitionStatusFilter;
  sort?: "asc" | "desc";
}

export interface CompetitionsPage {
  total: number;
  page: number;
  pageSize: number;
  items: Competition[];
}

export interface CompetitionFormPayload {
  id?: number;
  competitionTitle?: string;
  name?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  competitionLocation?: string;
  questionCooldownTime?: number;
  riddleCooldownTime?: number;
  selectedQuestions?: number[];
  selectedRiddles?: number[];
  emailEnabled: boolean;
  emailNotification?: {
    to: string;
    subject: string;
    body: string;
    sendInOneMinute: boolean;
    sendAtLocal?: string;
  }
}
