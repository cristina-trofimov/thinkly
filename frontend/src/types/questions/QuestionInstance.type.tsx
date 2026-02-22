export type QuestionInstance = {
    question_instance_id: number,
    question_id: number,
    event_id: number | null,
    points: number | null,
    riddle_id: number | null,
    is_riddle_completed: boolean | null,
}