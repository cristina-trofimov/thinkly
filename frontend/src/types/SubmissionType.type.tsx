export type SubmissionType = {
    user_id: number,
    question_instance_id: number,
    compile_output: string | null,
    status: string,
    runtime: number | null,
    memory: number | null,
    submitted_on: string,
    stdout: string | null,
    stderr: string | null,
    message: string | null,
}