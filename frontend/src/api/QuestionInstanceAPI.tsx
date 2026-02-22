import axiosClient from "@/lib/axiosClient";
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type";

export async function updateQuestionInstance(
  // question_instance_id: number | null,
  question_id: number,
  event_id: number | null,
  points: number | null,
  riddle_id: number | null,
  is_riddle_completed: boolean | null,
): Promise<any> {
  try {
    const response = await axiosClient.post(
        "/instances/update",
        {
            // question_instance_id: question_instance_id,
            question_id: question_id,
            event_id: event_id,
            points: points,
            riddle_id: riddle_id,
            is_riddle_completed: is_riddle_completed
        }
    )

    return response

  } catch (err) {
    console.error("Error updating most recent submission:", err)
    throw err
  }
}

export async function getQuestionInstance(
  question_id: number,
  event_id: number | null,
): Promise<QuestionInstance> {
  try {
    const response = await axiosClient.get<{
      question_instance_id: number
      event_id: number
      question_id: number
      points: number
      riddle_id: number
      is_riddle_completed: boolean
    }>(`/instances/find`, {
          params: {
            question_id: question_id,
            event_id: event_id,
          }
      })

    return response.data
  } catch (err) {
    console.error("Error fetching most recent submission:", err);
    throw err;
  }
}