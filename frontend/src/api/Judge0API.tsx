import axiosClient from "@/lib/axiosClient";

export async function postCode(
    ip: string,
    code: string,
    language_id: string,
    stdin: string,
    expected_output: string | null,
): Promise<Response> {
    try{
        const postResponse = await axiosClient.post(`http://${ip}/submissions`,
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
        )

        let getResponse = await axiosClient.get(`http://${ip}/submissions/` + postResponse.data.token)
        
        while (getResponse.data.status.description === "In queue" || getResponse.data.status.description === "Processing") {
            getResponse = await axiosClient.get(`http://${ip}/submissions/` + postResponse.data.token)
            
            console.log(getResponse.data.status.description)
            
            await new Promise(r => setTimeout(r, 500))
        }

        return getResponse.data
    } catch (err) {
        console.error("Error running code:", err);
        throw err;
    }
}
