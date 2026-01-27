export interface Question {
    id: number;
    title: string;
    description: string;
    media: string;
    preset_code: string;
    template_solution: string;
    difficulty: "Easy"|"Medium"|"Hard";
    date: Date;
}