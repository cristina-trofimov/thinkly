export interface CreateCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EmailPayload {
  to: string[];
  subject: string;
  text: string;
  sendAt?: string;
}