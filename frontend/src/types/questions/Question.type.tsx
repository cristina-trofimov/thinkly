export interface Question {
    question_id: number;
    question_name: string;
    question_description: string;
    media: string | null
    preset_code: string | null
    template_solution: string;
    difficulty: "Easy"|"Medium"|"Hard";
    from_string_function: string
    to_string_function: string
    created_at: Date
    last_modified_at: Date
}