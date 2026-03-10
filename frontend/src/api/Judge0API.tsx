import axiosClient from "@/lib/axiosClient";
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { updateMostRecentSub } from "./MostRecentSubAPI";
import type { CodeRunResponse } from "@/types/CodeRunResponse.type";
import { updateLastProgLang } from "./UserPreferencesAPI";
import { logFrontend } from "./LoggerAPI";


export function parse_input_output(testcases: TestcaseType[]) {
    let stdin: string = ''
    let expected_output: string | null = ''

    testcases.forEach((t) => {
        let inputs = ''
        Object.values(t.input_data).forEach((v) => {
            inputs += ` ${JSON.stringify(v)}`
        })
        stdin += `${inputs.trim()}\n`
        expected_output += `${t.expected_output}\n`
    })

    stdin.trimStart()
    expected_output = expected_output.trimStart()

    if (!expected_output) {
        expected_output = null
    }

    if (!stdin) {
        stdin = "Judge0"
    }

    return { stdin, expected_output }
}

export async function submitToJudge0(
    user_id: number,
    question_instance_id: number | undefined,
    source_code: string,
    language_id: number | undefined,
    testcases: TestcaseType[],
): Promise<CodeRunResponse> {
    try {
        if (!question_instance_id || !language_id) {
            throw new Error("RunCode: Question instance or language cannot be undefined")
        }
        const { stdin, expected_output } = parse_input_output(testcases)

        console.log("sumbitting")

        const response = await axiosClient.post(
            "/judge0",
            {
                source_code: source_code.trim(),
                language_id: `${language_id}`,
                stdin: stdin,
                expected_output: expected_output,
            }
        )

        const mostRecentSubResponse = await updateMostRecentSub(user_id, question_instance_id, source_code, language_id)

        const userPref = await updateLastProgLang(user_id, language_id)

        return {
            judge0Response: response['data'],
            mostRecentSubResponse: mostRecentSubResponse,
            userPrefs: userPref
        }

      } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `An error occurred when running the code. Reason: ${err}`,
            component: "Judge0API",
            url: globalThis.location.href,
            stack: (err as Error).stack,
        });
        throw err
      }
}
