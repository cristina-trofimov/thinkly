import axiosClient from "@/lib/axiosClient"
import {
  type CreateAlgotimeRequest,
  type CreateAlgotimeResponse,
  type AlgoTimeSession,
  type AlgoTimeSeries 
} from "../types/algoTime/AlgoTime.type"
import { logFrontend } from "./LoggerAPI";

export async function createAlgotime(
  payload: CreateAlgotimeRequest
): Promise<CreateAlgotimeResponse> {
    try{
  const response = await axiosClient.post<CreateAlgotimeResponse>(
    "/algotime/create",
    payload
  );
  return response.data
    }catch (err) {
      logFrontend({
        level: 'ERROR',
        message: `Error creating Algotime sessions: ${err}`,
        component: 'AlgotimeAPI',
        url: window.location.href,
    });
        throw err;
    }
}

export async function getAlgotimeSeries(): Promise<AlgoTimeSeries[]> {
  try {
    const response = await axiosClient.get<{
      series_id: number;
      series_name: string;
      sessions: {
        id: number;
        event_name: string;
        start_date: string;
        end_date: string;
        question_cooldown: number;
        questions: number[];
      }[];
    }[]>(`/algotime/`);

    const formatted: AlgoTimeSeries[] = response.data.map(series => ({
      seriesId: series.series_id,
      seriesName: series.series_name,
      sessions: series.sessions.map(session => ({
        id: session.id,
        eventName: session.event_name,
        startTime: session.start_date,
        endTime: session.end_date,
        questionCooldown: session.question_cooldown,
        questions: session.questions,
      })),
    }));

    return formatted;
  } catch (err) {
    logFrontend({
      level: 'ERROR',
      message: `Error fetching Algotime sessions: ${err}`,
      component: 'AlgotimeAPI',
      url: window.location.href,
  });
    throw err;
  }
}