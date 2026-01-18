import axiosClient from "@/lib/axiosClient";
import type CurrentStandings from "@/types/leaderboards/CurrentStandings.type";
import type { CompetitionWithParticipants } from "@/types/competition/CompetitionWithParticipants.type";
import { formatSecondsToTime } from '@/utils/formatTime';

// Backend response types
interface CompetitionLeaderboardResponse {
    id: string;
    name: string;
    date: string;
    participants: Array<{
        name: string;
        points: number;
        problemsSolved: number;
        rank: number;
        totalTime: number;
    }>;
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
}

interface AlgoTimeLeaderboardResponse {
    id: string;
    seriesId: string;
    name: string;
    date: string;
    participants: Array<{
        name: string;
        points: number;
        problemsSolved: number;
        rank: number;
        totalTime: number;
    }>;
}

// Get current leaderboard standings
export async function getCurrentCompetitionLeaderboard(): Promise<CurrentStandings> {
    const response = await axiosClient.get<CurrentCompetitionResponse>("/leaderboards/competitions/current");

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
            total_score: entry.totalScore,
            problems_solved: entry.problemsSolved,
            rank: entry.rank,
            total_time: formatSecondsToTime(entry.totalTime),
        }))
    };
}

// Get all competitions with their leaderboards (original endpoint)
export async function getCompetitionsDetails(): Promise<CompetitionWithParticipants[]> {
    const response = await axiosClient.get<CompetitionLeaderboardResponse[]>("/leaderboards/competitions");

    return response.data.map((comp) => ({
        id: parseInt(comp.id),
        competitionTitle: comp.name,
        date: new Date(comp.date),
        participants: comp.participants.map((p) => ({
            name: p.name,
            total_score: p.points,
            problems_solved: p.problemsSolved,
            rank: p.rank,
            total_time: formatSecondsToTime(p.totalTime),
        })),
    }));
}

// Get all AlgoTime leaderboard entries
export async function getAllAlgoTimeEntries(): Promise<CompetitionWithParticipants[]>  {
    const response = await axiosClient.get<CompetitionLeaderboardResponse[]>("/leaderboards/algotime");
    return response.data.map((comp) => ({
        id: parseInt(comp.id),
        competitionTitle: comp.name,
        date: new Date(comp.date),
        participants: comp.participants.map((p) => ({
            name: p.name,
            total_score: p.points,
            problems_solved: p.problemsSolved,
            rank: p.rank,
            total_time: formatSecondsToTime(p.totalTime),
        })),
    }));
}

// Get current AlgoTime session leaderboard
export async function getCurrentAlgoTimeLeaderboard() {
    const response = await axiosClient.get("/leaderboards/algotime/current");
    return response.data;
}