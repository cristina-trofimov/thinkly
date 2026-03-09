export type BaseEvent = {
    event_id: number,
    event_name: string
    event_location: string | null
    question_cooldown: number
    event_start_date: Date
    event_end_date: Date
    created_at: Date
    updated_at: Date
}