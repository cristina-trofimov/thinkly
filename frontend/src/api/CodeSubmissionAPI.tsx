import axiosClient from "@/lib/axiosClient"
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { submitToJudge0 } from "./Judge0API";
import type { Judge0Response } from "@/types/questions/Judge0Response";
import { getQuestionInstance, updateQuestionInstance } from "./QuestionInstanceAPI";


export async function submitAttempt(
    question_id: number,
    user_id: number,
    event_id: number | null,
    source_code: string,
    language_id: string,
    language_name: string,
    testcases: TestcaseType[],
): Promise<any> {
// ): {Promise<{ run_resp: Judge0Response; sub_resp: Response} >} {
    try {
        const code_run_response = await submitToJudge0(source_code, language_id, testcases)

        // Get/create instance for question_instance_id
        const question_instance = getQuestionInstance(1, 49)
        // const question_instance = updateQuestionInstance(question_id, event_id, null, null, null)

        console.log('question_instance')
        console.log(question_instance)
        
        // Add to most recent submission
        // const response = await axiosClient.post(
        //     "/attempts/add",
        //     {
        //         user_id: 21, // TO CHANGE
        //         question_instance_id: question_id, // TO CHANGE
        //         status: code_run_response['status']['description'],
        //         // code: source_code.trim(),
        //         memory: code_run_response['memory'],
        //         runtime: code_run_response['time'],
        //         submitted_on: Date.now(),
        //         stdout: code_run_response['stdout'],
        //         stderr: code_run_response['stderr'],
        //         compile_output: code_run_response['compile_output'],
        //         message: code_run_response['message'],
        //     }
        // )

        // return {code_run_response, response}

        return code_run_response
    } catch (err) {
        console.error("Error submitting coding attempt:", err);
        throw err;
    }
}

// export async function getAttempts(
//     question_id: number,
//     user_id: number,
//     event_id: number | null,
// ): Promise<Judge0Response> {
//     try {
//         // Get instance for question_instance_id

//         const response = await axiosClient.get(
//             "/attempts/all",
//             {
//                 user_id: 21, // TO CHANGE
//                 question_instance_id: question_id, // TO CHANGE
//                 status: code_run_response['status']['description'],
//                 // code: source_code.trim(),
//                 memory: code_run_response['memory'],
//                 runtime: code_run_response['time'],
//                 submitted_on: Date.now(),
//                 stdout: code_run_response['stdout'],
//                 stderr: code_run_response['stderr'],
//                 compile_output: code_run_response['compile_output'],
//                 message: code_run_response['message'],
//             }
//         )

//         return code_run_response
//     } catch (err) {
//         console.error("Error submitting coding attempt:", err);
//         throw err;
//     }
// }