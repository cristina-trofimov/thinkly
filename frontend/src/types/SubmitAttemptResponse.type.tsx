import type { CodeRunResponse } from "./CodeRunResponse.type";
import type { SubmissionType } from "./SubmissionType.type";
import type { QuestionInstance } from "./questions/QuestionInstance.type";

export interface SubmitAttemptResponse {
    codeRunResponse: CodeRunResponse,
    submissionResponse: {
        status_code: number,
        message: string,
    },
    // submissions: SubmissionType[]
    questionInstance: QuestionInstance
}