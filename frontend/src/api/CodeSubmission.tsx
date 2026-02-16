import axiosClient from "@/lib/axiosClient"
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { submitToJudge0 } from "./Judge0API";
import type { Judge0Response } from "@/types/questions/Judge0Response";


export async function submitAttempt(
    question_id: number,
    user_id: number,
    source_code: string,
    language_id: string,
    language_name: string,
    testcases: TestcaseType[],
): Promise<Judge0Response> {
    try {
        const code_run_response = await submitToJudge0(source_code, language_id, testcases)

        const response = await axiosClient.post(
            "/attempts/submit",
            {
                question_id: question_id,
                user_id: user_id,
                status: code_run_response['status']['description'],
                language: {
                    judge0_id: language_id,
                    name: language_name
                },
                code: source_code.trim(),
                memory: code_run_response['memory'],
                runtime: code_run_response['time'],
                submittedOn: Date.now(),
                stdout: code_run_response['stdout'],
                stderr: code_run_response['stderr'],
                compile_output: code_run_response['compile_output'],
                message: code_run_response['message'],
            }
        )

        return code_run_response
    } catch (err) {
        console.error("Error submitting coding attempt:", err);
        throw err;
    }
}