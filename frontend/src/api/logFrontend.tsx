import axiosClient from "@/lib/axiosClient"; // Assuming the path to your client
import type { LogPayload } from "@/types/LogPayload";
import { AxiosError } from "axios";

const BACKEND_LOG_PATH = '/log/client-log'; 

export const logFrontend = async (payload: LogPayload): Promise<void> => {
    try {
        // The payload body must exactly match the ClientLogPayload Pydantic model on the backend.
        const logBody = {
            level: payload.level.toUpperCase(),
            message: payload.message,
            component: payload.component,
            url: payload.url,
            stack: payload.stack || '', // Ensure stack is always a string if present
        };
        
        await axiosClient.post(BACKEND_LOG_PATH, logBody, {
        });

    } catch (error) {
        // Axios errors have a specific structure
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
             console.warn(
                `[ClientLog] Server failed to process log (Status: ${axiosError.response.status}).`,
                axiosError.response.data
             );
        } else if (axiosError.request) {
            // The request was made but no response was received (e.g., network timeout)
            console.error("[ClientLog] Failed to send log: No response received.", axiosError.message);
        } else {
            // Something else happened in setting up the request that triggered an error
            console.error("[ClientLog] Failed to send log due to request setup error:", axiosError.message);
        }
    }
};