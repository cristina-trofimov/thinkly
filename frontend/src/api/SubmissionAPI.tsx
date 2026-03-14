import axiosClient from "@/lib/axiosClient"
import type { SubmissionType } from "@/types/submissions/SubmissionType.type"
import { logFrontend } from "./LoggerAPI"


export async function saveSubmission(
    submission: SubmissionType
): Promise<SubmissionType> {
    try {
        const response = await axiosClient.post<{
          status_code: number
          data: SubmissionType
        }>(
            "/attempts/add",
            {
              user_question_instance_id: submission.user_question_instance_id,
              lang_judge_id: submission.lang_judge_id,
              compile_output: submission.compile_output,
              submitted_on: submission.submitted_on,
              runtime: submission.runtime,
              status: submission.status,
              memory: submission.memory,
              stdout: submission.stdout,
              stderr: submission.stderr,
              message: submission.message
            }
        )

        return response.data.data

    } catch (err) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when saving the submission. Reason: ${err}`,
        component: "CodeSubmissionAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
      throw err;
    }
}

export async function getAllSubmissions(
    user_question_instance_id: number | undefined,
  ): Promise<SubmissionType[]> {
    try {
      if(!user_question_instance_id) {
        throw new Error("getAllSubmissions: User's question instance cannot be undefined")
      }
      const response = await axiosClient.get<{
        status_code: number
        data: SubmissionType[]
      }>(`/attempts/all`, {
            params: { user_question_instance_id: user_question_instance_id }
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