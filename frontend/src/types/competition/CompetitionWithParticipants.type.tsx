import type { Participant } from "../account/Participant.type";

export type CompetitionWithParticipants = {
    id: number;
    competitionTitle: string;
    date: Date;
    participants: Participant[];
    showSeparator?: boolean;
};