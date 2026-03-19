export type UserPreferences = {
    pref_id: number,
    user_id: number,
    theme: "light" | "dark",
    notifications_enabled: boolean,
    last_used_programming_language: number | null,
}