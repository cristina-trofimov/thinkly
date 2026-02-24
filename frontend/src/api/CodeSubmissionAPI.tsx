import axiosClient from "@/lib/axiosClient"
import type { TestcaseType } from "@/types/questions/Testcases.type"
import { submitToJudge0 } from "./Judge0API"
import { getQuestionInstance, updateQuestionInstance } from "./QuestionInstanceAPI"
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type"
import type { Judge0Response } from "@/types/questions/Judge0Response"

interface AttemptResponse {
    judge0Response: Judge0Response,
    submissionResponse: {
        status_code: number,
        message: string,
    },
    questionInstance: QuestionInstance
}

export async function submitAttempt(
    question_id: number,
    user_id: number,
    event_id: number | null,
    source_code: string,
    language_id: string,
    testcases: TestcaseType[],
): Promise<AttemptResponse> {
    try {
        // 1. Submit to judge0
        const code_run_response = await submitToJudge0(source_code, language_id, testcases)

        // 2. Get/create instance for question_instance_id
        let q_inst: QuestionInstance | undefined 

        if (event_id) {
            const instances = await getQuestionInstance(question_id, event_id)
            q_inst = instances[0]
        }

        if (!q_inst) {
            q_inst = {
                question_instance_id: -1,
                question_id: question_id,
                event_id: event_id,
                points: null,
                riddle_id: null,
                is_riddle_completed: null,
            }
        }

        // 3. Update question instance
        const updatedInstance = await updateQuestionInstance(q_inst)

        // 4. Add submission
        const submissionResponse = await axiosClient.post(
            "/attempts/add",
            {
                user_id: user_id, //21
                question_instance_id: updatedInstance.question_instance_id,
                status: code_run_response['status']['description'],
                memory: code_run_response['memory'],
                runtime: code_run_response['time'],
                submitted_on: new Date(Date.now()).toISOString(),
                stdout: code_run_response['stdout'],
                stderr: code_run_response['stderr'],
                compile_output: code_run_response['compile_output'],
                message: code_run_response['message'],
            }
        )

        // 5. Add to most recent submission

        return {
            judge0Response: code_run_response,
            submissionResponse: submissionResponse.data,
            questionInstance: updatedInstance
        }

    } catch (err) {
        console.error("Error submitting coding attempt:", err);
        throw err;
    }
}
