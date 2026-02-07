export interface Competition {
  id: number;
  competitionTitle: string;
  competitionLocation: string;
  startDate: Date;
  endDate: Date;
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