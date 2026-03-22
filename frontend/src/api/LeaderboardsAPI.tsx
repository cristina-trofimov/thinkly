import axiosClient from "@/lib/axiosClient";
import type { CurrentStandings } from "@/types/leaderboards/CurrentStandings.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { formatSecondsToTime } from '@/utils/formatTime';

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

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AlgoTimeEntry {
    entryId: number;
    name: string;
    user_id: number;
    total_score: number;
    problems_solved: number;
    rank: number;
    total_time: string;
}

export interface AlgoTimeQueryParams {
    currentUserId?: number;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface AlgoTimePage {
    total: number;
    page: number;
    pageSize: number;
    entries: AlgoTimeEntry[];
}

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
    try {
        const params = currentUserId ? { current_user_id: currentUserId } : {};
        const response = await axiosClient.get<CurrentCompetitionResponse>(
            "/leaderboards/competitions/current",
            {
                params,
                headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            }
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
    } catch (err) {
        console.error("Error fetching current competition leaderboard:", err);
        throw err;
    }
}

/**
 * Get a paginated, optionally filtered and sorted list of past competitions.
 * All filtering and sorting is performed on the backend.
 */
export async function getCompetitionsDetails(
    params: CompetitionsQueryParams = {}
): Promise<CompetitionsPage> {
    try {
        const { currentUserId, search, sort = "desc", page = 1, pageSize = 20 } = params;

        const queryParams: Record<string, string | number> = { sort, page, page_size: pageSize };
        if (currentUserId !== undefined) queryParams.current_user_id = currentUserId;
        if (search?.trim()) queryParams.search = search.trim();

        const response = await axiosClient.get<PaginatedCompetitionsResponse>(
            "/leaderboards/competitions",
            {
                params: queryParams,
                headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            }
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
    } catch (err) {
        console.error("Error fetching competitions leaderboard:", err);
        throw err;
    }
}

/** Get ALL entries for a specific competition (no top-10 filtering — used for export) */
export async function getAllCompetitionEntries(
    competitionId: number
): Promise<CompetitionWithParticipants["participants"]> {
    try {
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
    } catch (err) {
        console.error(`Error fetching all entries for competition ${competitionId}:`, err);
        throw err;
    }
}

/**
 * Get top-10 entries for a specific competition (+ current user ±1 context if outside top 10).
 * Intended for the live in-session leaderboard widget — never cached.
 */
export async function getCompetitionLiveLeaderboard(
    competitionId: number,
    currentUserId?: number
): Promise<CurrentStandings> {
    try {
        const params = currentUserId ? { current_user_id: currentUserId } : {};
        const response = await axiosClient.get<{
            entries: Array<{
                name: string;
                userId: number | null;
                totalScore: number;
                problemsSolved: number;
                totalTime: number;
                rank: number;
            }>;
            showSeparator: boolean;
        }>(`/leaderboards/competitions/${competitionId}/live`, {
            params,
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });

        return {
            competitionName: "",   // caller has the name from the event object
            participants: response.data.entries.map((p) => ({
                name: p.name,
                user_id: p.userId ?? 0,
                total_score: p.totalScore,
                problems_solved: p.problemsSolved,
                rank: p.rank,
                total_time: formatSecondsToTime(p.totalTime),
            })),
            showSeparator: response.data.showSeparator,
        };
    } catch (err) {
        console.error(`Error fetching live leaderboard for competition ${competitionId}:`, err);
        throw err;
    }
}

/**
 * Get top-10 AlgoTime entries + current user context (±1) for the live in-session widget.
 * Uses no-cache headers — do not use for export.
 */
export async function getCurrentAlgoTimeLeaderboard(
    currentUserId?: number
): Promise<CurrentStandings> {
    try {
        const params = currentUserId ? { current_user_id: currentUserId } : {};
        const response = await axiosClient.get<{
            entries: Array<{
                entryId: number;
                name: string;
                userId: number | null;
                totalScore: number;
                problemsSolved: number;
                totalTime: number;
                rank: number;
            }>;
            showSeparator: boolean;
        }>("/leaderboards/algotime/current", {
            params,
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });

        return {
            competitionName: "AlgoTime Leaderboard",
            participants: response.data.entries.map((e) => ({
                name: e.name,
                user_id: e.userId ?? 0,
                total_score: e.totalScore,
                problems_solved: e.problemsSolved,
                rank: e.rank,
                total_time: formatSecondsToTime(e.totalTime),
            })),
            showSeparator: response.data.showSeparator,
        };
    } catch (err) {
        console.error("Error fetching current AlgoTime leaderboard:", err);
        throw err;
    }
}

/**
 * Get a single page of AlgoTime leaderboard entries.
 * All filtering and pagination is performed on the backend — a new request is
 * made only when the user changes page or updates the search query.
 */
export async function getAlgoTimeEntries(
    params: AlgoTimeQueryParams = {}
): Promise<AlgoTimePage> {
    try {
        const { currentUserId, search, page = 1, pageSize = 15 } = params;

        const queryParams: Record<string, string | number> = { page, page_size: pageSize };
        if (currentUserId !== undefined) queryParams.current_user_id = currentUserId;
        if (search?.trim()) queryParams.search = search.trim();

        const response = await axiosClient.get<{
            total: number;
            page: number;
            page_size: number;
            entries: Array<{
                entryId: number;
                name: string;
                userId: number;
                totalScore: number;
                problemsSolved: number;
                totalTime: number;
                rank: number;
                lastUpdated: string;
            }>;
        }>("/leaderboards/algotime", {
            params: queryParams,
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });

        return {
            total: response.data.total,
            page: response.data.page,
            pageSize: response.data.page_size,
            entries: response.data.entries.map((e) => ({
                entryId: e.entryId,

                name: e.name,
                user_id: e.userId,
                total_score: e.totalScore,
                problems_solved: e.problemsSolved,
                rank: e.rank,
                total_time: formatSecondsToTime(e.totalTime),
            })),
        };
    } catch (err) {
        console.error("Error fetching AlgoTime leaderboard entries:", err);
        throw err;
    }
}

/** Fetch ALL AlgoTime entries without pagination — used only for copy/download exports. */
export async function getAllAlgoTimeEntriesForExport(): Promise<AlgoTimeEntry[]> {
    try {
        const response = await axiosClient.get<Array<{
            entryId: number;
            name: string;
            userId: number;
            totalScore: number;
            problemsSolved: number;
            totalTime: number;
            rank: number;
        }>>("/leaderboards/algotime/all");

        return response.data.map((e) => ({
            entryId: e.entryId,
            seriesId: 0,
            name: e.name,
            user_id: e.userId,
            total_score: e.totalScore,
            problems_solved: e.problemsSolved,
            rank: e.rank,
            total_time: formatSecondsToTime(e.totalTime),
        }));
    } catch (err) {
        console.error("Error fetching all AlgoTime entries for export:", err);
        throw err;
    }
}

export async function resetAlgoTimeLeaderboard(): Promise<{ message: string; entriesDeleted: number }> {
    try {
        const response = await axiosClient.delete<{ message: string; entriesDeleted: number }>(
            "/leaderboards/algotime/reset"
        );
        return response.data;
    } catch (err) {
        console.error("Error resetting AlgoTime leaderboard:", err);
        throw err;
    }
}