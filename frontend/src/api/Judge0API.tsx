import axiosClient from "@/lib/axiosClient";

export async function postCode(
    code: string,
    language_id: string,
    stdin: string,
    expected_output: string | null,
): Promise<string> {
// ): Promise<Response> {
    try{
        const response = await axiosClient.post(
            "http://172.93.30.200:2358/submissions",
            {
                "source_code": code,
                //"#include <stdio.h>\n\nint main(void) {\n  char name[10];\n  scanf(\"%s\", name);\n  printf(\"hello, %s\\n\", name);\n  return 0\n}",
                "language_id": language_id,
                "number_of_runs": null,
                "stdin": stdin,
                //"Judge0",
                "expected_output": expected_output, //null,
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
        );
        
        return response.data.token
    } catch (err) {
        console.error("Error running code:", err);
        throw err;
    }
}

export async function getCodeResponse( token: string ): Promise<Response> {
    try{
        const response = await axiosClient.get("http://172.93.30.200:2358/submissions/" + token);
        return response.data
    } catch (err) {
        console.error("Error getting code results:", err);
        throw err;
    }
}
