export type UserPreferences = {
    pref_id: number,
    user_id: number,
    theme: string,
    notifications_enabled: boolean,
    last_used_programming_language: number | null,
}