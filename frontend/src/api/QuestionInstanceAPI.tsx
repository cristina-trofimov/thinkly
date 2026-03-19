import axiosClient from "@/lib/axiosClient";
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type";
import { logFrontend } from "./LoggerAPI";

export async function updateQuestionInstance(
  question_instance: QuestionInstance | undefined,
): Promise<QuestionInstance> {
  if (!question_instance) {
    throw new Error("Question instance cannot be undefined")
  }

  try {
    const response = await axiosClient.put(
      "/instances/put",
      {
        question_id: question_instance.question_id,
        event_id: question_instance.event_id,
        riddle_id: question_instance.riddle_id
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when updating question instance. Reason: ${err}`,
      component: "QuestionInstanceAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err
  }
}

export async function getQuestionInstance(
  question_id: number,
  event_id: number | null,
): Promise<QuestionInstance> {
  try {
    const response = await axiosClient.get<{
      status_code: number
      data: QuestionInstance
    }>(`/instances/find`, {
          params: {
            question_id: question_id,
            event_id: event_id,
          }
      })

    return response['data']['data']
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching question instance. Reason: ${err}`,
      component: "QuestionInstanceAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}

export async function getAllQuestionInstancesByEventID(event_id: number): Promise<QuestionInstance[]> {
  try {
    const response = await axiosClient.get<{
      status_code: number
      data: QuestionInstance[]
    }>(`/instances/by-event`, {
          params: { event_id: event_id }
      })

    return response['data']['data'] || []
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `Failed to fetching all question instances of an event. Reason: ${err}`,
      component: "QuestionInstanceAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}
