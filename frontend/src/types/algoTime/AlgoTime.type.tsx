export type Session = {
    id: string;
    sessionNumber: number;
    date: string;
};

export type CreateAlgotimeSession = {
    name: string
    date: string
    startTime: string
    endTime: string 
    location?: string;
    selectedQuestions: number[]
  }
  
  export type CreateAlgotimeRequest = {
    seriesName: string
    questionCooldown?: number
    sessions: CreateAlgotimeSession[]
  }
  
  export type CreateAlgotimeResponse = {
    series_id: number
    series_name: string
    session_count: number
  }

export interface AlgoTimeQuestion {
  questionId: number;
  questionName: string;
  questionDescription: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  points: number;
}

export interface AlgoTimeSession {
  id: number;
  eventID: number;
  eventName: string;
  startTime: Date;
  endTime: Date;
  questionCooldown: number;
  location?: string;
  seriesId?: number | null;
  seriesName?: string | null;
  questionCount?: number;
  questions: AlgoTimeQuestion[];
}

export interface AlgoTimeSeries {
  seriesId: number;
  seriesName: string;
  sessions: AlgoTimeSession[];
}

export type AlgoTimeStatusFilter = "active" | "upcoming" | "completed";

export interface AlgoTimeSessionApiItem {
  id: number;
  eventName: string;
  startTime: string;
  endTime: string;
  questionCooldown: number;
  location?: string | null;
  seriesId?: number | null;
  seriesName?: string | null;
  questionCount: number;
}

export interface AlgoTimeSessionApiPage {
  total: number;
  page: number;
  page_size: number;
  items: AlgoTimeSessionApiItem[];
}

export interface AlgoTimeSessionsPageParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AlgoTimeStatusFilter;
  sort?: "asc" | "desc";
}

export interface AlgoTimeSessionsPage {
  total: number;
  page: number;
  pageSize: number;
  items: AlgoTimeSession[];
}
