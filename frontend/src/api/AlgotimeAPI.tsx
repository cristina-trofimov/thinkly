import axiosClient from "@/lib/axiosClient"
import {
  type CreateAlgotimeRequest,
  type CreateAlgotimeResponse,
  type AlgoTimeQuestion,
  type AlgoTimeSeries,
  type AlgoTimeSession
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

export async function getAllAlgotimeSessions(): Promise<AlgoTimeSession[]> {
  try {
    const response = await axiosClient.get(`/algotime/`);

    const formatted: AlgoTimeSession[] = (response.data ?? []).map((session: any) => ({
      id: session.id,
      eventName: session.event_name,
      startTime: new Date(session.start_date),
      endTime: new Date(session.end_date),
      questionCooldown: session.question_cooldown,
      seriesId: session.series_id ?? null,
      seriesName: session.series_name ?? null,
      questions: (session.questions ?? []).map((q: any): AlgoTimeQuestion => ({
        questionId: q.question_id,
        questionName: q.question_name,
        questionDescription: q.question_description,
        difficulty: q.difficulty,
        tags: q.tags ?? [],
        points: q.points ?? 0,
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