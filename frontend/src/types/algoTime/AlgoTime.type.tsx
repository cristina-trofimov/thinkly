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

  export type AlgoTimeSession = {
    id: number;
    eventName: string;
    startTime: string;
    endTime: string;
    questionCooldown: number;
    questions: number[];
  }
  export type AlgoTimeSeries = {
    seriesId: number;
    seriesName: string;
    sessions: AlgoTimeSession[];
  }