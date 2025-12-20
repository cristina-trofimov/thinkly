export interface Question {
    id: string;
    title: string;
    difficulty: "Easy"|"Medium"|"Hard";
    date: Date;
}