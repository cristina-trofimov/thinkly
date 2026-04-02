import axiosClient from "@/lib/axiosClient";
import type { CodeRunResponse } from "@/types/submissions/CodeRunResponse.type";
import { updateLastProgLang } from "./UserPreferencesAPI";
import { logFrontend } from "./LoggerAPI";
import type { TestCase } from "@/types/questions/QuestionPagination.type";
import { getTestCasesByQuestionId } from "./QuestionsAPI";

function serializeJudge0Value(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    if (typeof value === "object") {
        return Object.values(value as Record<string, unknown>)
            .map((entry) => serializeJudge0Value(entry))
            .join(" ")
            .trim();
    }

    return String(value);
}

export function parse_input_output(testcases: TestCase[]) {
    let stdin: string = ''
    let expected_output: string | null = ''

    testcases.forEach((t) => {
        stdin += `${serializeJudge0Value(t.input_data)}\n`
        expected_output += `${serializeJudge0Value(t.expected_output)}\n`
    })

    stdin = stdin.trimStart()
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
    question_instance_id: number | undefined,
    question_id: number | undefined,
    source_code: string,
    language_id: number | undefined,
    userId: number,
): Promise<CodeRunResponse> {
    try {
        if (!question_instance_id || !language_id) {
            throw new Error("RunCode: Question instance or language cannot be undefined");
        }

        const testcases = await getTestCasesByQuestionId(question_id);

        // Create submissions array for batch processing
        const submissions = testcases.map((testcase) => {
            return {
                userId: userId,
                language_id: `${language_id}`,
                source_code: source_code.trim(),
                stdin: serializeJudge0Value(testcase.input_data),
                expected_output: serializeJudge0Value(testcase.expected_output),
            };
        });

        const response = await axiosClient.post(
            "/judge0",
            {
                submissions,
            }
        );

        const userPref = await updateLastProgLang(userId, language_id);

        return {
            judge0Response: response['data'],
            userPrefs: userPref,
        };
    } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `An error occurred when running the code. Reason: ${err}`,
            component: "Judge0API",
            url: globalThis.location.href,
            stack: (err as Error).stack,
        });
        throw err;
    }
}
