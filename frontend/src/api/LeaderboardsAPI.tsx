import axiosClient from "@/lib/axiosClient";
import type { CurrentStandings } from "@/types/leaderboards/CurrentStandings.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { formatSecondsToTime } from '@/utils/formatTime';
import type {AlgoTimeLeaderboardBackendEntry} from "@/types/algoTime/AlgoTimeLeaderboard.type";


// Backend response types
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

// Get current leaderboard standings
export async function getCurrentCompetitionLeaderboard(currentUserId?: number): Promise<CurrentStandings> {
    const params = currentUserId ? { current_user_id: currentUserId } : {};
    const response = await axiosClient.get<CurrentCompetitionResponse>("/leaderboards/competitions/current", { params });

    if (!response.data.competition || response.data.entries.length === 0) {
        return {
            competitionName: "No Active Competition",
            participants: []
        };
    }

    return {
        competitionName: response.data.competition.name,
        participants: response.data.entries.map((entry) => ({
            name: entry.name,
            user_id: entry.userId || 0,
            total_score: entry.totalScore,
            problems_solved: entry.problemsSolved,
            rank: entry.rank,
            total_time: formatSecondsToTime(entry.totalTime),
        })),
        showSeparator: response.data.showSeparator || false,
    };
}

// Get all competitions with their leaderboards (original endpoint)
export async function getCompetitionsDetails(currentUserId?: number): Promise<CompetitionWithParticipants[]> {
    const params = currentUserId ? { current_user_id: currentUserId } : {};
    console.log("getCompetitionsDetails - Sending params:", params);
    const response = await axiosClient.get<CompetitionLeaderboardResponse[]>("/leaderboards/competitions", { params });
    console.log("getCompetitionsDetails - Response length:", response.data.length);

    return response.data.map((comp) => ({
        id: parseInt(comp.id),
        competitionTitle: comp.name,
        date: new Date(comp.date),
        participants: comp.participants.map((p) => ({
            name: p.name,
            user_id: p.userId || 0,
            total_score: p.points,
            problems_solved: p.problemsSolved,
            rank: p.rank,
            total_time: formatSecondsToTime(p.totalTime),
        })),
        showSeparator: comp.showSeparator || false,
    }));
}

// Get all AlgoTime leaderboard entries
export async function getAllAlgoTimeEntries(): Promise<AlgoTimeLeaderboardResponse[]>  {
    const response = await axiosClient.get<AlgoTimeLeaderboardBackendEntry[]>("/leaderboards/algotime");

    return response.data.map((entry) => ({
        entryId: entry.entryId,
        seriesId: entry.algoTimeSeriesId,
        name: entry.name,
        user_id: entry.userId || 0,
        total_score: entry.totalScore,
        problems_solved: entry.problemsSolved,
        rank: entry.rank,
        total_time: formatSecondsToTime(entry.totalTime),
    }));
}