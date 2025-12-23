export interface Question {
    id: number;
    title: string;
    difficulty: "Easy"|"Medium"|"Hard";
    date: Date;
}