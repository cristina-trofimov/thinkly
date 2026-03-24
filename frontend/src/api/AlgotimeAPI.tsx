import axiosClient from "@/lib/axiosClient"
import {
  type CreateAlgotimeRequest,
  type CreateAlgotimeResponse,
  type AlgoTimeQuestion,
  type AlgoTimeSession,
  type CreateAlgotimeSession,
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
        url: globalThis.location.href,
    });
        throw err;
    }
}

export async function getAllAlgotimeSessions(): Promise<AlgoTimeSession[]> {
  try {
    const response = await axiosClient.get<AlgoTimeSession[]>(`/algotime/`);

    const formatted: AlgoTimeSession[] = (response.data ?? []).map((session) => ({
      id: session.id,
      eventID: session.eventID,
      eventName: session.eventName,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      questionCooldown: session.questionCooldown,
      seriesId: session.seriesId ?? null,
      seriesName: session.seriesName ?? null,
      questions: (session.questions ?? []).map((q): AlgoTimeQuestion => ({
        questionId: q.questionId,
        questionName: q.questionName,
        questionDescription: q.questionDescription,
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
      url: globalThis.location.href,
  });
    throw err;
  }
}

export const getAlgotimeById = async (sessionId: number) => {
  try {
    const response = await axiosClient.get(
      `/algotime/${sessionId}`
    );
    const session = response.data;

    return {
      ...session,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      location: session.location ?? "",
    };

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `Error fetching Algotime session ${sessionId}: ${err}`,
      component: "AlgotimeAPI",
      url: globalThis.location.href,
    });
    throw err;
  }
};

export const updateAlgotime = async (
  sessionId: number,
  payload: CreateAlgotimeSession
) => {
  try {
    const response = await axiosClient.put(
      `/algotime/${sessionId}`,
      payload
    );
    return response.data;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `Error updating Algotime session ${sessionId}: ${err}`,
      component: "AlgotimeAPI",
      url: globalThis.location.href,
    });
    throw err;
  }
};

export async function deleteAlgotime(sessionId: number): Promise<void> {
  try {
    await axiosClient.delete(`/algotime/${sessionId}`);
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `Error deleting Algotime session ${sessionId}: ${err}`,
      component: "AlgotimeAPI",
      url: globalThis.location.href,
    });
    throw err;
  }
}