import axiosClient from "@/lib/axiosClient";
import { BACKEND_URL } from "../config";
import type { Competition } from "@/types/competition/Competition.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";


// ============= Types for New Endpoints =============
export interface CreateCompetitionPayload {
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
    text: string;
    sendInOneMinute: boolean;
    sendAtLocal?: string;
  };
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


// ============= Existing Functions =============
export async function getCompetitions(): Promise<Competition[]> {
  try {
    const response = await axiosClient.get<{
      id: number;
      competition_title: string;
      date: Date;
    }[]>(`${BACKEND_URL}/homepage/get-competitions`);

    const formatted: Competition[] = response.data.map(c => ({
      id: c.id,
      competitionTitle: c.competition_title,
      date: c.date,
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
    }[]>(`${BACKEND_URL}/homepage/get-competitions`);

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
  payload: CreateCompetitionPayload
): Promise<CompetitionResponse> {
  try {
    const response = await axiosClient.post<CompetitionResponse>(
      `${BACKEND_URL}/competitions/create`,
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
      `${BACKEND_URL}/competitions/list`
    );
    return response.data;
  } catch (err) {
    console.error("Error listing competitions:", err);
    throw err;
  }
}


/**
 * Get a specific competition by ID
 * Requires authentication
 */
export async function getCompetitionById(
  competitionId: number
): Promise<CompetitionResponse> {
  try {
    const response = await axiosClient.get<CompetitionResponse>(
      `${BACKEND_URL}/competitions/${competitionId}`
    );
    return response.data;
  } catch (err) {
    console.error(`Error fetching competition ${competitionId}:`, err);
    throw err;
  }
}


/**
 * Delete a competition
 * Requires owner authentication
 */
export async function deleteCompetition(competitionId: number): Promise<void> {
  try {
    await axiosClient.delete(`${BACKEND_URL}/competitions/${competitionId}`);
  } catch (err) {
    console.error(`Error deleting competition ${competitionId}:`, err);
    throw err;
  }
}


/**
 * Get all competitions (legacy endpoint for compatibility)
 * No authentication required
 */
export async function getAllCompetitionsLegacy(): Promise<any[]> {
  try {
    const response = await axiosClient.get(`${BACKEND_URL}/competitions/`);
    return response.data;
  } catch (err) {
    console.error("Error fetching competitions (legacy):", err);
    throw err;
  }
}