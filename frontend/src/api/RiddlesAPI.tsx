import axiosClient from "@/lib/axiosClient";
import type { Riddle } from "../types/riddle/Riddle.type";



// Define the parameters needed to create a riddle
export interface CreateRiddleParams {
    question: string;
    answer: string;
    file?: string | null;
}

/**
 * Fetch all riddles
 * Maps backend response (riddle_question) -> frontend object (question)
 */
export async function getRiddles(): Promise<Riddle[]> {
    try {
        const response = await axiosClient.get<
            {
                riddle_id: number;
                riddle_question: string;
                riddle_answer: string;
                riddle_file: string | null;
            }[]
        >("/riddles/");

        const formattedRiddles: Riddle[] = response.data.map((r) => ({
            id: r.riddle_id,
            question: r.riddle_question,
            answer: r.riddle_answer,
            file: r.riddle_file,
        }));

        return formattedRiddles;
    } catch (err) {
        console.error("Error fetching riddles:", err);
        throw err;
    }
}

/**
 * Create a new riddle
 */
export async function createRiddle(params: CreateRiddleParams): Promise<Riddle> {
    try {
        const response = await axiosClient.post<{
            riddle_id: number;
            riddle_question: string;
            riddle_answer: string;
            riddle_file: string | null;
        }>("/riddles/create", params);

        const newRiddle: Riddle = {
            id: response.data.riddle_id,
            question: response.data.riddle_question,
            answer: response.data.riddle_answer,
            file: response.data.riddle_file,
        };

        return newRiddle;
    } catch (err) {
        console.error("Error creating riddle:", err);
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
        console.error(`Error deleting riddle ${riddleId}:`, err);
        throw err;
    }
}

/**
 * Get a single riddle by ID
 */
export async function getRiddleById(riddleId: number): Promise<Riddle> {
    try {
        const response = await axiosClient.get<{
            riddle_id: number;
            riddle_question: string;
            riddle_answer: string;
            riddle_file: string | null;
        }>(`/riddles/${riddleId}`);

        const riddle: Riddle = {
            id: response.data.riddle_id,
            question: response.data.riddle_question,
            answer: response.data.riddle_answer,
            file: response.data.riddle_file,
        };

        return riddle;
    } catch (err) {
        console.error(`Error fetching riddle ${riddleId}:`, err);
        throw err;
    }
}