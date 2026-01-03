export interface CreateCompetitionDialogProps {
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  questionCooldownTime: number;
  riddleCooldownTime: number;
  selectedQuestions: number[];
  selectedRiddles: number[];
  emailEnabled: boolean;
  emailNotification?: {
    to: string;
    subject: string;
    body: string;
    sendInOneMinute: boolean;
    sendAtLocal?: string;
  }
}



export interface CompetitionResponse {
  event_id: number;
  event_name: string;
  event_location: string | null;
  event_start_date: string; // ISO datetime
  event_end_date: string; // ISO datetime
  question_cooldown: number;
  riddle_cooldown: number;
  question_count: number;
  riddle_count: number;
  created_at: string; // ISO datetime
}
