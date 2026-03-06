import axiosClient from "@/lib/axiosClient";
import type { Riddle } from "../types/riddle/Riddle.type";
import { logFrontend } from "./LoggerAPI";

// ---------------- Types ----------------

export interface CreateRiddleParams {
    question: string;
    answer: string;
    file?: File | null;
}

export interface UpdateRiddleParams {
    riddleId: number;
    question?: string;
    answer?: string;
    // If provided, backend will delete old file + upload this new one
    file?: File | null;
    // If true, backend will delete old file and set riddle_file = null
    removeFile?: boolean;
}

// Backend response shape
type RiddleDTO = {
    riddle_id: number;
    riddle_question: string;
    riddle_answer: string;
    riddle_file: string | null;
};

function mapRiddle(dto: RiddleDTO): Riddle {
    return {
        id: dto.riddle_id,
        question: dto.riddle_question,
        answer: dto.riddle_answer,
        file: dto.riddle_file,
    };
}

// ---------------- API ----------------

export async function getRiddles(): Promise<Riddle[]> {
    try {
        const response = await axiosClient.get<RiddleDTO[]>("/riddles/");
        return response.data.map(mapRiddle);
    } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `Failed fetch riddles: ${String(err)}`,
            component: "RiddlesAPI.ts",
            url: globalThis.location.href,
        });
        throw err;
    }
}

/**
 * Create a new riddle (multipart/form-data)
 */
export async function createRiddle(params: CreateRiddleParams): Promise<Riddle> {
    try {
        const form = new FormData();
        form.append("question", params.question);
        form.append("answer", params.answer);
        if (params.file) form.append("file", params.file);

        const response = await axiosClient.post<RiddleDTO>("/riddles/create", form, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return mapRiddle(response.data);
    } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `Failed to create riddle: ${String(err)}`,
            component: "RiddlesAPI.ts",
            url: globalThis.location.href,
        });
        throw err;
    }
}

/**
 * Update riddle (multipart/form-data)
 * - Send only fields you want to change
 * - If file provided: replaces existing file (backend deletes old, uploads new)
 * - If removeFile true: deletes existing file and clears riddle_file
 */
export async function updateRiddle(params: UpdateRiddleParams): Promise<Riddle> {
    try {
        const form = new FormData();

        if (params.question !== undefined) form.append("question", params.question);
        if (params.answer !== undefined) form.append("answer", params.answer);

        // IMPORTANT: FastAPI expects remove_file (snake_case)
        if (params.removeFile !== undefined) {
            form.append("remove_file", String(params.removeFile)); // "true"/"false"
        }

        if (params.file) {
            form.append("file", params.file);
        }

        const response = await axiosClient.put<RiddleDTO>(`/riddles/${params.riddleId}`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return mapRiddle(response.data);
    } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `Failed to update riddle: ${String(err)}`,
            component: "RiddlesAPI.ts",
            url: globalThis.location.href,
        });
        throw err;
    }
}

/**
 * Delete a single riddle
 */
export async function deleteRiddle(riddleId: number): Promise<void> {
    try {
        await axiosClient.delete(`/riddles/${riddleId}`);
    } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `Failed to delete riddle: ${String(err)}`,
            component: "RiddlesAPI.ts",
            url: globalThis.location.href,
        });
        throw err;
    }
}

/**
 * Get a single riddle by ID
 */
export async function getRiddleById(riddleId: number | undefined | null): Promise<Riddle | null> {
    try {
        if (!riddleId) {
            return null
        }
        const response = await axiosClient.get<RiddleDTO>(`/riddles/${riddleId}`);
        return mapRiddle(response.data);
    } catch (err) {
        logFrontend({
            level: "ERROR",
            message: `Failed to fetch single riddle: ${String(err)}`,
            component: "RiddlesAPI.ts",
            url: globalThis.location.href,
        });
        throw err;
    }
}
