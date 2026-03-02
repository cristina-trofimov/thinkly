import axiosClient from "@/lib/axiosClient";
import type { CurrentStandings } from "@/types/leaderboards/CurrentStandings.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { formatSecondsToTime } from '@/utils/formatTime';
import type { AlgoTimeLeaderboardBackendEntry } from "@/types/algoTime/AlgoTimeLeaderboard.type";

// ─── Backend response types ───────────────────────────────────────────────────

interface CompetitionLeaderboardResponse {
    id: string;
    name: string;
    date: string;
    participants: Array<{
        name: string;
        userId: number | null;
        points: number;
        problemsSolved: number;
        rank: number;
        totalTime: number;
    }>;
    showSeparator?: boolean;
}

interface PaginatedCompetitionsResponse {
    total: number;
    page: number;
    page_size: number;
    competitions: CompetitionLeaderboardResponse[];
}

interface CurrentCompetitionResponse {
    message?: string;
    competition: {
        id: number;
        name: string;
        startDate: string;
        endDate: string;
    } | null;
    entries: Array<{
        entryId: number;
        name: string;
        userId: number | null;
        totalScore: number;
        problemsSolved: number;
        rank: number;
        totalTime: number;
    }>;
    showSeparator?: boolean;
}

interface AlgoTimeLeaderboardResponse {
    entryId: number;
    seriesId: number;
    name: string;
    user_id: number;
    total_score: number;
    problems_solved: number;
    rank: number;
    total_time: string;
}

interface PaginatedAlgoTimeResponse {
    entries: AlgoTimeLeaderboardResponse[];
    showSeparator: boolean;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CompetitionsPage {
    total: number;
    page: number;
    pageSize: number;
    competitions: CompetitionWithParticipants[];
}

export interface CompetitionsQueryParams {
    currentUserId?: number;
    search?: string;
    sort?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Get current leaderboard standings */
export async function getCurrentCompetitionLeaderboard(
    currentUserId?: number
): Promise<CurrentStandings> {
    const params = currentUserId ? { current_user_id: currentUserId } : {};
    const response = await axiosClient.get<CurrentCompetitionResponse>(
        "/leaderboards/competitions/current",
        { params }
    );

    if (!response.data.competition || response.data.entries.length === 0) {
        return {
            competitionName: "No Active Competition",
            participants: [],
            showSeparator: false,
        };
    }

    return {
        competitionName: response.data.competition.name,
        participants: response.data.entries.map((entry) => ({
            name: entry.name,
            user_id: entry.userId ?? 0,
            total_score: entry.totalScore,
            problems_solved: entry.problemsSolved,
            rank: entry.rank,
            total_time: formatSecondsToTime(entry.totalTime),
        })),
        showSeparator: response.data.showSeparator ?? false,
    };
}

/**
 * Get a paginated, optionally filtered and sorted list of past competitions.
 * All filtering and sorting is performed on the backend — do not re-filter on the client.
 */
export async function getCompetitionsDetails(
    params: CompetitionsQueryParams = {}
): Promise<CompetitionsPage> {
    const {
        currentUserId,
        search,
        sort = "desc",
        page = 1,
        pageSize = 20,
    } = params;

    const queryParams: Record<string, string | number> = {
        sort,
        page,
        page_size: pageSize,
    };
    if (currentUserId !== undefined) queryParams.current_user_id = currentUserId;
    if (search?.trim()) queryParams.search = search.trim();

    const response = await axiosClient.get<PaginatedCompetitionsResponse>(
        "/leaderboards/competitions",
        { params: queryParams }
    );

    return {
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.page_size,
        competitions: response.data.competitions.map((comp) => ({
            id: Number.parseInt(comp.id),
            competitionTitle: comp.name,
            date: new Date(comp.date),
            participants: comp.participants.map((p) => ({
                name: p.name,
                user_id: p.userId ?? 0,
                total_score: p.points,
                problems_solved: p.problemsSolved,
                rank: p.rank,
                total_time: formatSecondsToTime(p.totalTime),
            })),
            showSeparator: comp.showSeparator ?? false,
        })),
    };
}

/** Get ALL entries for a specific competition (no top-10 filtering — used for export) */
export async function getAllCompetitionEntries(
    competitionId: number
): Promise<CompetitionWithParticipants["participants"]> {
    const response = await axiosClient.get<Array<{
        name: string;
        userId: number | null;
        points: number;
        problemsSolved: number;
        rank: number;
        totalTime: number;
    }>>(`/leaderboards/competitions/${competitionId}/all`);

    return response.data.map((p) => ({
        name: p.name,
        user_id: p.userId ?? 0,
        total_score: p.points,
        problems_solved: p.problemsSolved,
        rank: p.rank,
        total_time: formatSecondsToTime(p.totalTime),
    }));
}

/**
 * Get AlgoTime leaderboard entries.
 * The backend applies the same top-10 + user-context window filtering used by competition
 * endpoints, so the client receives only the rows it needs to display.
 */
export async function getAllAlgoTimeEntries(
    currentUserId?: number
): Promise<{ entries: AlgoTimeLeaderboardResponse[]; showSeparator: boolean }> {
    const params = currentUserId ? { current_user_id: currentUserId } : {};
    const response = await axiosClient.get<PaginatedAlgoTimeResponse>(
        "/leaderboards/algotime",
        { params }
    );

    return {
        showSeparator: response.data.showSeparator,
        entries: response.data.entries.map((entry) => ({
            entryId: entry.entryId,
            seriesId: entry.seriesId,
            name: entry.name,
            user_id: entry.user_id,
            total_score: entry.total_score,
            problems_solved: entry.problems_solved,
            rank: entry.rank,
            total_time: entry.total_time,
        })),
    };
}