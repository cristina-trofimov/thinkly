import axiosClient from "@/lib/axiosClient"
import type { TestcaseType } from "@/types/questions/Testcases.type"
import { submitToJudge0 } from "./Judge0API"
import { getQuestionInstance, updateQuestionInstance } from "./QuestionInstanceAPI"
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type"
import type { SubmitAttemptResponse } from "@/types/SubmitAttemptResponse.type"
import type { SubmissionType } from "@/types/SubmissionType.type"
import { logFrontend } from "./LoggerAPI"


export async function submitAttempt(
    user_id: number,
    question_id: number,
    event_id: number | null,
    source_code: string,
    language_id: string,
    testcases: TestcaseType[],
): Promise<SubmitAttemptResponse> {
    try {
        // 1. Get/create instance for question_instance_id
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

        // 2. Update question instance
        const updatedInstance = await updateQuestionInstance(q_inst)

        // 3. Submit to judge0 and save most recent submission
        const { judge0Response, mostRecentSubResponse, userPrefs } = await submitToJudge0(updatedInstance.question_instance_id, source_code, language_id, testcases)

        // 4. Save submission's output details
        const submissionResponse = await axiosClient.post(
            "/attempts/add",
            {
                user_id: user_id,
                question_instance_id: updatedInstance.question_instance_id,
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
            questionInstance: updatedInstance
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
    question_instance_id: number,
  ): Promise<SubmissionType[]> {
    try {
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