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
  eventName: string;
  startTime: Date;
  endTime: Date;
  questionCooldown: number;
  seriesId?: number | null;
  seriesName?: string | null;
  questions: AlgoTimeQuestion[];
}

export interface AlgoTimeSeries {
  seriesId: number;
  seriesName: string;
  sessions: AlgoTimeSession[];
}