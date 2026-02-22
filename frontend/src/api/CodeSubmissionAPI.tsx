import axiosClient from "@/lib/axiosClient"
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { submitToJudge0 } from "./Judge0API";
import type { Judge0Response } from "@/types/questions/Judge0Response";
import { getQuestionInstance, updateQuestionInstance } from "./QuestionInstanceAPI";
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type";


export async function submitAttempt(
    question_id: number,
    user_id: number,
    event_id: number | null,
    source_code: string,
    language_id: string,
    // q_inst: QuestionInstance,
    testcases: TestcaseType[],
): Promise<any> {
// ): {Promise<{ run_resp: Judge0Response; sub_resp: Response} >} {
    try {
        // 1. Submit to judge0
        const code_run_response = await submitToJudge0(source_code, language_id, testcases)

        // 2. Get/create instance for question_instance_id
        // const question_instance = getQuestionInstance(question_id, event_id)
        // const question_instance = getQuestionInstance(2, 5)
        // const q_inst = getQuestionInstance(2, 5)

        let q_inst: QuestionInstance | undefined 
        // = {
        //     question_instance_id: -1,
        //     question_id: question_id,
        //     event_id: event_id,
        //     points: null,
        //     riddle_id: null,
        //     is_riddle_completed: null,
        // }
        if (event_id) {
            console.log("event_id")
            // q_inst = (await getQuestionInstance(question_id, event_id)).at(0)
            const instances = await getQuestionInstance(question_id, event_id)
            q_inst = instances[0]
        }

        if (!q_inst) {
            q_inst = {
                question_instance_id: -1,
                question_id: question_id,
                event_id: event_id,
                points: 0,
                riddle_id: null,
                is_riddle_completed: null,
            }
        }

        // 3. Update question instance
        const updatedInstance = updateQuestionInstance(q_inst)

        console.log('updatedInstance')
        console.log(updatedInstance)
        
        // 4. Add submission
        // Add to most recent submission
        // const submissionResponse = await axiosClient.post(
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

        // 5. Add to most recent submission

        // return {
        //     judge0Response: code_run_response,
        //     submissionResponse: submissionResponse.data,
        //     questionInstance: updatedInstance
        // }

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