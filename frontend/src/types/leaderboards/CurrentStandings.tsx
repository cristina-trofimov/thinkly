import type { Participant } from "@/components/interfaces/Participant";

export default interface CurrentStandings {
    competitionName: string;
    participants: Participant[];
}