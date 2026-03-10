import axiosClient from "@/lib/axiosClient"
import type { UserPreferences } from "@/types/UserPreferences.type"
import { logFrontend } from "./LoggerAPI"


export async function updateAllPrefs(
  prefs: UserPreferences,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.post(
      "/prefs/add",
      {
        user_id: prefs.user_id,
        theme: prefs.theme,
        notifications_enabled: prefs.notifications_enabled,
        last_used_programming_language: prefs.last_used_programming_language
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when updating all user preferences. Reason: ${err}`,
      component: "UserPreferencesAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err
  }
}

export async function updateThemePref(
  user_id: number, theme: string,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.patch(
      "/prefs/theme",
      {
        user_id: user_id,
        theme: theme
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when updating user's theme preference. Reason: ${err}`,
      component: "UserPreferencesAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err
  }
}

export async function updateNotifPref(
  user_id: number, notifications_enabled: boolean
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.patch(
      "/prefs/notif",
      {
        user_id: user_id,
        notifications_enabled: notifications_enabled
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when updating user's notification settings. Reason: ${err}`,
      component: "UserPreferencesAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err
  }
}
export async function updateLastProgLang(
  user_id: number, last_used_programming_language: number,
): Promise<UserPreferences> {
  try {
    const response = await axiosClient.patch(
      "/prefs/prog",
      {
        user_id: user_id,
        last_used_programming_language: last_used_programming_language
      }
    )

    return response['data']['data'] || response['data']

  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when updating user's last programming language used. Reason: ${err}`,
      component: "UserPreferencesAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
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
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching user preferences. Reason: ${err}`,
      component: "UserPreferencesAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}