import type { Participant } from "./Participant";

export type Competition = {
    id: string;
    name: string;
    date: string;
    participants: Participant[];
};
