export type UserQuestionInstance = {
    user_question_instance_id: number,
    user_id: number,
    question_instance_id: number,
    points: number | null,
    riddle_complete: boolean | null,
    lapse_time: BigInt | null,
    attempts: number | null,
}