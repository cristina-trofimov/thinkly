import type { Participant } from "../account/Participant.type";

export type CurrentStandings = {
    competitionName: string;
    participants: Participant[];
    showSeparator?: boolean;
}

