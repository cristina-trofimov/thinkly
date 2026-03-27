import axiosClient from "@/lib/axiosClient";
import type {
  Competition,
  CompetitionApiItem,
  CompetitionApiPage,
  CompetitionFormPayload,
  CompetitionsPage,
  CompetitionsPageParams,
} from "@/types/competition/Competition.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { logFrontend } from "./LoggerAPI";

const mapCompetition = (competition: CompetitionApiItem): Competition => ({
  id: competition.id,
  competitionTitle: competition.competition_title,
  competitionLocation: competition.competition_location ?? "",
  startDate: new Date(competition.start_date),
  endDate: new Date(competition.end_date),
});

export async function getCompetitionsPage(
  params: CompetitionsPageParams = {}
): Promise<CompetitionsPage> {
  const { page = 1, pageSize = 12, search, status, sort = "desc" } = params;

  try {
    const response = await axiosClient.get<CompetitionApiPage>("/competitions/", {
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
      items: response.data.items.map(mapCompetition),
    };
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching competitions. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    });
    throw err;
  }
}

export async function getCompetitions(): Promise<Competition[]> {
  try {
    const firstPage = await getCompetitionsPage();
    let items = [...firstPage.items];
    const totalPages = Math.ceil(firstPage.total / firstPage.pageSize);

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await getCompetitionsPage({
        page,
        pageSize: firstPage.pageSize,
      });
      items = [...items, ...nextPage.items];
    }

    return items;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching competitions. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    });
    throw err;
  }
}


export async function getCompetitionsDetails(): Promise<CompetitionWithParticipants[]> {
  try {
    const response = await axiosClient.get<{
      id: number;
      competition_title: string;
      date: Date;
    }[]>(`/homepage/get-competitions`);

    const formatted: CompetitionWithParticipants[] = response.data.map(c => ({
      id: c.id,
      competitionTitle: c.competition_title,
      date: c.date,
      participants: [],
    }));

    return formatted;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching competitions details. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}


// ============= New Competition Management Functions =============
/**
 * Create a new competition
 * Requires owner authentication
 */
export async function createCompetition(
  payload: CompetitionFormPayload
): Promise<CompetitionFormPayload> {
  try {
    const response = await axiosClient.post<CompetitionFormPayload>(
      `/competitions/create`,
      payload
    );
    return response.data;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when creating competition. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}


/**
 * Get all competitions with detailed information
 * Requires authentication
 */
export async function listCompetitions(): Promise<CompetitionFormPayload[]> {
  try {
    const response = await axiosClient.get<CompetitionFormPayload[]>(
      `/competitions/list`
    );
    return response.data;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when listing competitions. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}


/**
 * Get a specific competition by ID with all details for editing
 * Requires authentication
 */
export const getCompetitionById = async (competitionId: number) => {
  try {
    const response = await axiosClient.get(
      `/competitions/${competitionId}`
    );
    return response.data;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching a competition by ID. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
};


/**
 * Delete a competition
 * Requires owner authentication
 */
export async function deleteCompetition(competitionId: number): Promise<void> {
  try {
    await axiosClient.delete(`/competitions/${competitionId}`);
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when deleting competition. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}

/**
 * Update an existing competition
 * Requires owner authentication
 */
export const updateCompetition = async (payload: CompetitionFormPayload) => {
  try {
    const response = await axiosClient.put(
      `/competitions/${payload.id}`,
      payload
    );
    return response.data;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when updating competition. Reason: ${err}`,
      component: "CompetitionAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
};

