
export interface EmailNotificationProps {
  to: string;
  subject: string;
  body: string;
  sendInOneMinute: boolean;
  sendAtLocal?: string;
}

export interface UpdateCompetitionProps {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  questionCooldownTime: number;
  riddleCooldownTime: number;
  selectedQuestions: number[];
  selectedRiddles: number[];
  emailEnabled: boolean;
  emailNotification?: EmailNotificationProps;
}