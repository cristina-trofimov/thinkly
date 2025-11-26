import type { Participant } from "@/types/account/Participant.type";

export default interface CurrentStandings {
    competitionName: string;
    participants: Participant[];
}