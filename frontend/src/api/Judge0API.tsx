import axiosClient from "@/lib/axiosClient";
import type { Judge0Response } from "@/types/questions/Judge0Response";

export async function judge0(
    source_code: string,
    language_id: string,
    stdin: string | "Judge0",
    expected_output: string | null,
): Promise<any> {
    try {
        const response = await axiosClient.post(
            "/judge0",
            {
                source_code: source_code,
                language_id: language_id,
                stdin: stdin,
                expected_output: expected_output,
            }
        );
  
        return response

      } catch (err) {
        console.error("Error running the code:", err);
        throw err;
      }
}

export async function submitToJudge0(
    ip: string,
    code: string,
    language_id: string,
    stdin: string | "Judge0",
    expected_output: string | null,
): Promise<Judge0Response> {
    const controller = new AbortController()
    try{
        const postResponse = await axiosClient.post(`http://${ip}/submissions`,
            {
                "source_code": code,
                "language_id": language_id,
                "number_of_runs": null,
                "stdin": stdin,
                "expected_output": expected_output,
                "cpu_time_limit": null,
                "cpu_extra_time": null,
                "wall_time_limit": null,
                "memory_limit": null,
                "stack_limit": null,
                "max_processes_and_or_threads": null,
                "enable_per_process_and_thread_time_limit": null,
                "enable_per_process_and_thread_memory_limit": null,
                "max_file_size": null,
                "enable_network": null
            }
        )

        const getResponse = await getOutput(ip, postResponse.data.token, controller.signal)

        return getResponse
    } catch (err) {
        console.error("Error running code with Judge0:", err);
        throw err;
    }
}

export async function getOutput(
    ip: string,
    token: string,
    signal: AbortSignal,
    intervalMs = 500,
    maxAttempts = 30,
): Promise<Judge0Response> {
    try{
        if (signal.aborted) throw new Error("Judge0 polling aborted")
        if (maxAttempts === 0) throw new Error("Judge0 polling timed out")

        const response = await axiosClient.get(`http://${ip}/submissions/` + token, {signal})
        const desc = response.data.status.description

        if (desc === "In Queue" || desc === "Processing") {
            await new Promise(r => setTimeout(r, intervalMs))
            return await getOutput(ip, token, signal, maxAttempts - 1)
        }

        return response.data
    } catch (err) {
        console.error("Error getting Judge0 console ouput:", err);
        throw err;
    }
}
