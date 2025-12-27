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
  
  export type CreateAlgoTimeRequest = {
    seriesName: string
    questionCooldown?: number
    sessions: CreateAlgotimeSession[]
  }
  
  export type CreateAlgoTimeResponse = {
    series_id: number
    series_name: string
    session_count: number
  }