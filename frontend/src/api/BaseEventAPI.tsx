import axiosClient from "@/lib/axiosClient"
import type { BaseEvent } from "@/types/BaseEvent.type"
import { logFrontend } from "./LoggerAPI"


export async function updateEvent(
  event: BaseEvent,
): Promise<BaseEvent> {
  try {
    const response = await axiosClient.post(
      "/events/update",
      {
        event_id: event.event_id,
        event_name: event.event_name,
        event_location: event.event_location,
        question_cooldown: event.question_cooldown,
        event_start_date: event.event_start_date,
        event_end_date: event.event_end_date,
        created_at: event.created_at,
        updated_at: event.updated_at,
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `Failed to update event. Reason: ${err}`,
      component: "BaseEventAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err
  }
}

export async function getEventByID(event_id: number): Promise<BaseEvent> {
  try {
    const response = await axiosClient.get<{
      status_code: number
      data: BaseEvent
    }>(`/events/find`, {
          params: {
            event_id: event_id,
          }
      })

    return response['data']['data']
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `Failed to update event by id. Reason: ${err}`,
      component: "BaseEventAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}