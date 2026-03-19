import axiosClient from "@/lib/axiosClient"
import type { MostRecentSub } from "@/types/submissions/MostRecentSub.type"
import { logFrontend } from "./LoggerAPI"

export async function updateMostRecentSub(
    user_question_instance_id: number,
    code: string,
    lang_judge_id: number,
): Promise<MostRecentSub> {
    try {
        const response = await axiosClient.put<{
          status_code: number
          data: MostRecentSub
        }>(
            "/recent-sub/put",
            {
                user_question_instance_id: user_question_instance_id,
                code: code,
                lang_judge_id: lang_judge_id,
                submitted_on: new Date(),
            }
        )

        return response.data.data

      } catch (err) {
        logFrontend({
          level: "ERROR",
          message: `An error occurred when updating most recent submission. Reason: ${err}`,
          component: "MostRecentSubAPI",
          url: globalThis.location.href,
          stack: (err as Error).stack,
        })
        throw err
      }
}


export async function getMostRecentSub(
    user_question_instance_id: number,
): Promise<MostRecentSub> {
    try {
      const response = await axiosClient.get<{
        status_code: number
        data: MostRecentSub
      }>(`/recent-sub/latest`, {
        params: {
            user_question_instance_id: user_question_instance_id
        }
      })

      return response.data.data
    } catch (err) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when fetching most recent submission. Reason: ${err}`,
        component: "MostRecentSubAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      })
      throw err;
    }
}
