import type {
  LoginsDataPoint,
  ParticipationDataPoint,
  TimeRange,
} from "@/types/adminDashboard/Analytics.type";

export interface ParticipationOverTimeChartProps {
  data: ParticipationDataPoint[];
  timeRange: TimeRange;
  loading?: boolean;
  eventType?: "algotime" | "competitions";
}

export interface NumberOfLoginsChartProps {
  data: LoginsDataPoint[];
  loading?: boolean;
}

export interface QuestionsSolvedData extends Record<string, unknown> {
  name: string;
  value: number;
  color?: string;
}

export interface QuestionsSolvedChartProps {
  data: QuestionsSolvedData[];
  loading?: boolean;
}

export interface LabelViewBox {
  cx?: number;
  cy?: number;
}

export interface CenterLabelProps {
  totalQuestions: number;
  viewBox?: LabelViewBox;
}

export interface TimeToSolveChartProps {
  data: TimeToSolveData[];
  loading?: boolean;
}

export interface TimeToSolveData {
  type: string;
  time: number;
}
