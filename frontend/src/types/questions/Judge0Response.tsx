export interface Judge0Response {
    time: string | null
    token: string | null
    stdout: string | null
    stderr: string | null
    compile_output: string | null
    message: string | null
    memory: string | null
    status: {
        id: number
        description: string
    }
}
