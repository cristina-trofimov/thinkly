import axiosClient from "@/lib/axiosClient";
import type { UserQuestionInstance } from "@/types/submissions/UserQuestionInstance.type";
import { logFrontend } from "./LoggerAPI";

export async function putUserInstance(
    user_question_instance: UserQuestionInstance | null | undefined
) : Promise<UserQuestionInstance> {
    try {
        if (!user_question_instance) {
            throw new Error("Need to pass a valid user's question instance");
        }

        const resp = await axiosClient.put<{
            status_code: number
            data: UserQuestionInstance
          }>(
            '/user-instances/put',
            {
                user_id: user_question_instance.user_id,
                question_instance_id: user_question_instance.question_instance_id,
                points: user_question_instance.points,
                riddle_complete: user_question_instance.riddle_complete,
                lapse_time: user_question_instance.lapse_time,
                attempts: user_question_instance.attempts
            }
        )

        return resp['data']['data']
    } catch (error) {
        logFrontend({
            level: "ERROR",
            message: `An error occurred when putting a user's question instance. Reason: ${error}`,
            component: "UserQuestionInstanceAPI",
            url: globalThis.location.href,
            stack: (error as Error).stack,
        })
        throw error
    }
}

export async function getUserInstance(
    user_id: number | undefined,
    question_instance_id: number | undefined
) : Promise<UserQuestionInstance> {
    try {
        const resp = await axiosClient.get<{
            status_code: number
            data: UserQuestionInstance
        }>(
            '/user-instances/instance',
            { params: {
                user_id: user_id,
                question_instance_id: question_instance_id
            }}
        )

        return resp['data']['data']
    } catch (error) {
        logFrontend({
            level: "ERROR",
            message: `An error occurred when fetching a user's question instance. Reason: ${error}`,
            component: "UserQuestionInstanceAPI",
            url: globalThis.location.href,
            stack: (error as Error).stack,
        })
        throw error
    }
}