import axiosClient from "@/lib/axiosClient";
import type { Judge0Response } from "@/types/questions/Judge0Response";
import type { TestcaseType } from "@/types/questions/Testcases.type";

function input_output(testcases: TestcaseType[]) {
    let stdin: string = ''
    let expected_output: string | null = ''

    testcases.forEach((t) => {
        let inputs = ''
        Object.values(t.input_data).forEach((v) => {
            inputs += ` ${JSON.stringify(v)}`
        })
        stdin += `${inputs.trim()}\n`
        expected_output += `${JSON.stringify(t.expected_output)}\n`
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
    source_code: string,
    language_id: string,
    testcases: TestcaseType[],
): Promise<Judge0Response> {
    try {
        const { stdin, expected_output } = input_output(testcases)

        const response = await axiosClient.post(
            "/judge0",
            {
                source_code: source_code.trim(),
                language_id: language_id,
                stdin: stdin,
                expected_output: expected_output,
            }
        );
  
        return response['data']

      } catch (err) {
        console.error("Error running the code:", err);
        throw err;
      }
}
