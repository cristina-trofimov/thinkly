import axiosClient from "@/lib/axiosClient"
import {
  type CreateAlgotimeRequest,
  type CreateAlgotimeResponse,
  type AlgoTimeSessionApiItem,
  type AlgoTimeSessionApiPage,
  type AlgoTimeSessionsPage,
  type AlgoTimeSessionsPageParams,
  type AlgoTimeSession,
  type CreateAlgotimeSession,
} from "../types/algoTime/AlgoTime.type"
import { logFrontend } from "./LoggerAPI";

const mapAlgoTimeSessionCard = (session: AlgoTimeSessionApiItem): AlgoTimeSession => ({
  id: session.id,
  eventName: session.eventName,
  startTime: new Date(session.startTime),
  endTime: new Date(session.endTime),
  questionCooldown: session.questionCooldown,
  location: session.location ?? "",
  seriesId: session.seriesId ?? null,
  seriesName: session.seriesName ?? null,
  questionCount: session.questionCount,
  questions: [],
});

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

export async function getAlgotimeSessionsPage(
  params: AlgoTimeSessionsPageParams = {}
): Promise<AlgoTimeSessionsPage> {
  const { page = 1, pageSize = 12, search, status, sort = "desc" } = params;

  try {
    const response = await axiosClient.get<AlgoTimeSessionApiPage>("/algotime/", {
      params: {
        page,
        page_size: pageSize,
        search: search?.trim() || undefined,
        status,
        sort,
      },
    });

    return {
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.page_size,
      items: response.data.items.map(mapAlgoTimeSessionCard),
    };
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

export async function getAllAlgotimeSessions(): Promise<AlgoTimeSession[]> {
  try {
    const firstPage = await getAlgotimeSessionsPage();
    let items = [...firstPage.items];
    const totalPages = Math.ceil(firstPage.total / firstPage.pageSize);

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await getAlgotimeSessionsPage({
        page,
        pageSize: firstPage.pageSize,
      });
      items = [...items, ...nextPage.items];
    }

    return items;
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
