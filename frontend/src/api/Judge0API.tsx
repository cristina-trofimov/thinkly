import axiosClient from "@/lib/axiosClient";
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { updateMostRecentSub } from "./MostRecentSubAPI";
import type { CodeRunResponse } from "@/types/CodeRunResponse.type";
import { updateLastProgLang } from "./UserPreferencesAPI";
import { getProfile } from "./AuthAPI";


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
    question_instance_id: number,
    source_code: string,
    language_id: string,
    testcases: TestcaseType[],
): Promise<CodeRunResponse> {
    try {
        const { stdin, expected_output } = parse_input_output(testcases)

        const response = await axiosClient.post(
            "/judge0",
            {
                source_code: source_code.trim(),
                language_id: language_id,
                stdin: stdin,
                expected_output: expected_output,
            }
        )

        const user = await getProfile()

        const mostRecentSubResponse = await updateMostRecentSub(user.id, question_instance_id, source_code, Number.parseInt(language_id))

        const userPref = await updateLastProgLang(user.id, Number.parseInt(language_id))

        return {
            judge0Response: response['data'],
            mostRecentSubResponse: mostRecentSubResponse,
            userPrefs: userPref
        }

      } catch (err) {
        console.error("Error running the code:", err)
        throw err
      }
}
