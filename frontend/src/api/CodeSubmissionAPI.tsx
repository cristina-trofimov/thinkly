import axiosClient from "@/lib/axiosClient"
import type { TestcaseType } from "@/types/questions/Testcases.type"
import { submitToJudge0 } from "./Judge0API"
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type"
import type { SubmitAttemptResponse } from "@/types/SubmitAttemptResponse.type"
import type { SubmissionType } from "@/types/SubmissionType.type"
import { logFrontend } from "./LoggerAPI"


export async function submitAttempt(
    question_instance: QuestionInstance | undefined,
    user_id: number,
    event_id: number | undefined,
    source_code: string,
    language_id: number | undefined,
    testcases: TestcaseType[],
): Promise<SubmitAttemptResponse> {
    try {
        if (!question_instance || !language_id) {
            throw new Error("SubmitAttempt: Question instance and language cannot be undefined")
        }
        if(event_id) {
            // 1.a Competition/Algotime points calculation
        }

        // 1.b Submit to judge0 and save most recent submission
        const { judge0Response, mostRecentSubResponse, userPrefs } = await submitToJudge0(user_id, question_instance.question_instance_id, source_code, language_id, testcases)

        // 2. Save submission's output details
        const submissionResponse = await axiosClient.post(
            "/attempts/add",
            {
                user_id: user_id,
                question_instance_id: question_instance.question_instance_id,
                status: judge0Response['status']['description'],
                memory: judge0Response['memory'],
                runtime: judge0Response['time'],
                submitted_on: new Date(Date.now()).toISOString(),
                stdout: judge0Response['stdout'],
                stderr: judge0Response['stderr'],
                compile_output: judge0Response['compile_output'],
                message: judge0Response['message'],
            }
        )

        return {
            codeRunResponse: {
                judge0Response: judge0Response,
                mostRecentSubResponse: mostRecentSubResponse,
                userPrefs: userPrefs
            },
            submissionResponse: submissionResponse.data,
            leaderboard: null
        }

    } catch (err) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when submitting code. Reason: ${err}`,
        component: "CodeSubmissionAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
      throw err;
    }
}

export async function getAllSubmissions(
    user_id: number,
    question_instance_id: number | undefined,
  ): Promise<SubmissionType[]> {
    try {
      if(!question_instance_id) {
        throw new Error("getAllSubmissions: Question instance cannot be undefined")
      }
      const response = await axiosClient.get<{
        status_code: number
        data: SubmissionType[]
      }>(`/attempts/all`, {
            params: {
              user_id: user_id,
              question_instance_id: question_instance_id,
            }
        })
  
      return response['data']['data']
    } catch (err) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when fetching user's submission. Reason: ${err}`,
        component: "CodeSubmissionAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
      throw err;
    }
  }