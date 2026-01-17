import axiosClient from "@/lib/axiosClient";
import type { Competition } from "@/types/competition/Competition.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { type CreateCompetitionProps, type CompetitionResponse} from "../types/competition/CreateCompetition.type";

// ============= Existing Functions =============
export async function getCompetitions(): Promise<Competition[]> {
  try {
    const response = await axiosClient.get<{
      id: string;
      competition_title: string;
      competition_location: string;
      start_date: Date;
      end_date: Date;
    }[]>(`/competitions/`);
    
    const formatted: Competition[] = response.data.map(c => ({
      id: c.id,
      competitionTitle: c.competition_title,
      competitionLocation: c.competition_location,
      startDate: new Date(c.start_date),
      endDate: new Date(c.end_date),
    }));
    
    return formatted;
  } catch (err) {
    console.error("Error fetching competitions:", err);
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
    console.error("Error fetching competitions:", err);
    throw err;
  }
}


// ============= New Competition Management Functions =============
/**
 * Create a new competition
 * Requires owner authentication
 */
export async function createCompetition(
  payload: CreateCompetitionProps
): Promise<CompetitionResponse> {
  try {
    const response = await axiosClient.post<CompetitionResponse>(
      `/competitions/create`,
      payload
    );
    return response.data;
  } catch (err) {
    console.error("Error creating competition:", err);
    throw err;
  }
}


/**
 * Get all competitions with detailed information
 * Requires authentication
 */
export async function listCompetitions(): Promise<CompetitionResponse[]> {
  try {
    const response = await axiosClient.get<CompetitionResponse[]>(
      `/competitions/list`
    );
    return response.data;
  } catch (err) {
    console.error("Error listing competitions:", err);
    throw err;
  }
}


/**
 * Get a specific competition by ID with all details for editing
 * Requires authentication
 */
export const getCompetitionById = async (competitionId: string) => {
  try {
    const response = await axiosClient.get(
      `/competitions/${competitionId}`
    );
    return response.data;
  } catch (err) {
    console.error('Error fetching competition by ID:', err);
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
    console.error(`Error deleting competition ${competitionId}:`, err);
    throw err;
  }
}

/**
 * Update an existing competition
 * Requires owner authentication
 */
export const updateCompetition = async (payload: any) => {
  try {
    const response = await axiosClient.put(
      `/competitions/${payload.id}`,
      payload
    );
    return response.data;
  } catch (err) {
    console.error('Error updating competition:', err);
    throw err;
  }
};

