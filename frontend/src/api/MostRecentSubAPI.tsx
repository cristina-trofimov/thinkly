import axiosClient from "@/lib/axiosClient"
import type { MostRecentSub } from "@/types/MostRecentSub.type"

export async function updateMostRecentSub(
    user_id: number,
    question_instance_id: number,
    code: string,
    lang_judge_id: number,
): Promise<MostRecentSub> {
    try {
        const response = await axiosClient.post(
            "/recent-sub/update",
            {
                user_id: user_id,
                question_instance_id: question_instance_id,
                code: code,
                lang_judge_id: lang_judge_id,
            }
        )

        return response.data

      } catch (err) {
        console.error("Error updating most recent submission:", err)
        throw err
      }
}


export async function getMostRecentSub(
    user_id: number,
    question_instance_id: number,
): Promise<MostRecentSub> {
    try {
      const response = await axiosClient.get<{
        status_code: number
        data: MostRecentSub
      }>(`/recent-sub/latest`, {
        params: {
            user_id: user_id,
            question_instance_id: question_instance_id,
        }
      })

      return response.data.data
    } catch (err) {
      console.error("Error fetching most recent submission:", err);
      throw err;
    }
}
