import type { BaseEvent } from "@/types/BaseEvent.type"
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type"
import type { Question, TestCase } from "@/types/questions/QuestionPagination.type"
import type { SubmissionType } from "@/types/submissions/SubmissionType.type"
import type { SubmitAttemptResponse } from "@/types/submissions/SubmitAttemptResponse.type"
import type { UserQuestionInstance } from "@/types/submissions/UserQuestionInstance.type"
import { submitToJudge0 } from "./Judge0API"
import { logFrontend } from "./LoggerAPI"
import { updateMostRecentSub } from "./MostRecentSubAPI"
import { saveSubmission } from "./SubmissionAPI"
import { putUserInstance } from "./UserQuestionInstanceAPI"
import { upsertAlgoTimeLeaderboardEntry, upsertCompetitionLeaderboardEntry } from "./LeaderboardsAPI"

export async function submitAttempt(
    question: Question | undefined,
    questionInstance: QuestionInstance | undefined,
    userQuestionInstance: UserQuestionInstance | undefined,
    event: BaseEvent | undefined | null,
    source_code: string,
    language_id: number | undefined,
    testcases: TestCase[],
    userId: number,
    isAlgoTime: boolean = false,
  ): Promise<SubmitAttemptResponse> {
    try {
      if (!questionInstance || !userQuestionInstance || !question || !language_id) {
        throw new Error("SubmitAttempt: missing field between (question, question instance, user question instance, or language) cannot be undefined")
      }

      if (event && questionInstance.riddle_id && !userQuestionInstance.riddle_complete) {
        throw new Error("SubmitAttempt: riddle needs to be completed")
      }

      // 1. Submit to judge0 and save most recent submission
      const { judge0Response, userPrefs } = await submitToJudge0(questionInstance.question_instance_id, source_code, language_id, testcases, userId)

      // 2. Competition/Algotime points calculation
      if (event && judge0Response.status.description.toLocaleLowerCase() === "accepted") {
        if (question.difficulty.toLowerCase() == 'easy') {
          userQuestionInstance.points = 100
        } else if (question.difficulty.toLowerCase() == 'medium') {
          userQuestionInstance.points = 200
        } else {
          userQuestionInstance.points = 300
        }
      }

      // 3. Update user question instance
      userQuestionInstance = await putUserInstance(userQuestionInstance)

      // 4. Save most recent submission
      const mostRecentSubResponse = await updateMostRecentSub(userQuestionInstance.user_question_instance_id, source_code, language_id)

      // 5. Update leaderboard based on session type
      if (isAlgoTime && event) {
        await upsertAlgoTimeLeaderboardEntry(userId)
      } else if (!isAlgoTime && event) {
        await upsertCompetitionLeaderboardEntry(userId, event.event_id)
      }

      // 6. Save submission's output details
      let runtime: number | null = null
      let memory: number | null = null

      if (judge0Response['time']) {
        runtime = Number.parseInt(judge0Response['time'])
      }

      if (judge0Response['memory']) {
        memory = Number.parseInt(judge0Response['memory'])
      }

      const submissionResponse = await saveSubmission({
        submission_id: -1,
        user_question_instance_id: userQuestionInstance.user_question_instance_id,
        lang_judge_id: language_id,
        status: judge0Response['status']['description'],
        memory: memory,
        runtime: runtime,
        submitted_on: new Date(Date.now()),
        stdout: judge0Response['stdout'],
        stderr: judge0Response['stderr'],
        compile_output: judge0Response['compile_output'],
        message: judge0Response['message'],
      } as SubmissionType)

      return {
        codeRunResponse: {
          judge0Response: judge0Response,
          userPrefs: userPrefs
        },
        submissionResponse: submissionResponse,
        mostRecentSubResponse: mostRecentSubResponse,
      }

    } catch (err) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when submitting code. Reason: ${err}`,
        component: "SubmitCodeAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
      throw err;
    }
  }