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