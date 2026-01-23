export type AlgoTimeLeaderboardBackendEntry = {
    entryId: number;
    algoTimeSeriesId: number;
    name: string;
    userId: number | null;
    totalScore: number;
    problemsSolved: number;
    totalTime: number;
    rank: number;
    lastUpdated: string;
}