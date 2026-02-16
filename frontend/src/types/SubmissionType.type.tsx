export type SubmissionType = {
    question_id: number,
    user_id: number,
    status: string,
    language: {
        judge0_id: string,
        name: string
    },
    code: string,
    memory: string,
    runtime: string,
    submittedOn: string,
    stdout: string | null,
    stderr: string | null,
    compile_output: string | null,
    message: string | null,
}