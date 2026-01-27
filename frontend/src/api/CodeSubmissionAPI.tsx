import axiosClient from "@/lib/axiosClient"

// status: string,
//     language: string,
//     memory: string,
//     runtime: string,
//     submittedOn: string,
//     console_output: string,

export async function submitCode(
    status: string,
    language: string,
    code: string,
    memory: string,
    runtime: string,
    submittedOn: string,
    console_output: string,
): Promise<Response> {
    try{
        const response = await axiosClient.post(`http://${ip}/submissions`,
            {
                "status": code,
                //"#include <stdio.h>\n\nint main(void) {\n  char name[10];\n  scanf(\"%s\", name);\n  printf(\"hello, %s\\n\", name);\n  return 0\n}",
                "language": language_id,
                "code": null,
                "memory": stdin,
                "runtime": expected_output, //null,
                "submittedOn": expected_output, //null,
                "console_output": null,
            }
        )

        return response.data
    } catch (err) {
        console.error("Error submitting coding attempt:", err);
        throw err;
    }
}
