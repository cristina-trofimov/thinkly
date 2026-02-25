import axiosClient from "@/lib/axiosClient"
import type { UserPreferences } from "@/types/UserPreferences.type"


// pref_id: number,
//     user_id: number,
//     theme: string,
//     notifications_enabled: boolean,
//     last_used_programming_language: number | null,
export async function updateAllPrefs(
  prefs: UserPreferences,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.post(
      "/prefs/update",
      {
        user_id: prefs.user_id,
        theme: prefs.theme,
        notifications_enabled: prefs.notifications_enabled,
        last_used_programming_language: prefs.last_used_programming_language
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    console.error("Error updating all user preferences:", err)
    throw err
  }
}

export async function updateThemePref(
  user_id: number, theme: string,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.post(
      "/prefs/theme",
      {
        user_id: user_id,
        theme: theme
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    console.error("Error updating user's theme preference:", err)
    throw err
  }
}

export async function updateNotifPref(
  user_id: number, notifications_enabled: boolean
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.post(
      "/prefs/notif",
      {
        user_id: user_id,
        notifications_enabled: notifications_enabled
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    console.error("Error updating user's notification settings:", err)
    throw err
  }
}
export async function updateLastProgLang(
  user_id: number, last_used_programming_language: number,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.post(
      "/prefs/prog",
      {
        user_id: user_id,
        last_used_programming_language: last_used_programming_language
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    console.error("Error updating user's last programming language used:", err)
    throw err
  }
}

export async function getUserPrefs(
  user_id: number,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.get<{
      status_code: number
      data: UserPreferences
    }>(`/prefs/all`, {
          params: {
            user_id: user_id,
          }
      })

    return response['data']['data']
  } catch (err) {
    console.error("Error fetching user preferences:", err);
    throw err;
  }
}