import type { CodeRunResponse } from "./CodeRunResponse.type";

export interface SubmitAttemptResponse {
    codeRunResponse: CodeRunResponse,
    submissionResponse: {
        status_code: number,
        message: string,
    },
    leaderboard: null //| leaderboard type to be clarified
}