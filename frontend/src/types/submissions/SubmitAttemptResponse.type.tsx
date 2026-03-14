import type { CodeRunResponse } from "./CodeRunResponse.type";
import type { SubmissionType } from "./SubmissionType.type";

export interface SubmitAttemptResponse {
    codeRunResponse: CodeRunResponse,
    submissionResponse: SubmissionType
}