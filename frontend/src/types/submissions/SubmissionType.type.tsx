export type SubmissionType = {
    submission_id: number,
    user_question_instance_id: number,
    compile_output: string | null,
    status: string,
    runtime: number | null,
    memory: number | null,
    submitted_on: Date,
    stdout: string | null,
    stderr: string | null,
    message: string | null,
}