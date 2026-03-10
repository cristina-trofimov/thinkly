import axiosClient from "../src/lib/axiosClient"
import type { UserPreferences } from "../src/types/account/UserPreferences.type"
import { getUserPrefs, updateAllPrefs, updateThemePref, updateNotifPref, updateLastProgLang } from "../src/api/UserPreferencesAPI"
import { logFrontend } from "../src/api/LoggerAPI"

beforeAll(() => {
    Object.defineProperty(global, 'import', {
        value: {
        meta: {
            env: {
            VITE_BACKEND_URL: 'http://localhost:8000'
            }
        }
        }
    })
})

jest.mock('../src/lib/axiosClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
    API_URL: 'http://localhost:8000',
}))

jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn()
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const mockedLogger = logFrontend as jest.Mock

const user_id = 1

const mockUserPrefs: UserPreferences = {
    pref_id: 1,
    user_id: user_id,
    theme: "light",
    notifications_enabled: true,
    last_used_programming_language: 71
}

const mockResponse = {
    status_code: 200,
    data: mockUserPrefs
}


describe("User preferences", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("getUserPrefs: returns all the preferences associated with a given user_id", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockResponse }))

        await getUserPrefs(user_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/prefs/all", {"params": {"user_id": user_id }}
        )
    })

    it("handles errors from getUserPrefs", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching user preferences"))

        await expect(getUserPrefs(user_id))
                    .rejects.toThrow("Error fetching user preferences")

        expect(mockedAxios.get).toHaveBeenCalled()
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserPreferencesAPI",
            })
        )
    })

    it("updateAllPrefs: updates all the user preferences", async () => {
        mockedAxios.post.mockImplementation(async () => ({ data: mockResponse }))

        await updateAllPrefs(mockUserPrefs)
        
        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
        expect(mockedAxios.post).toHaveBeenCalledWith(
            "/prefs/add",
            expect.objectContaining({
                user_id: mockUserPrefs.user_id,
                theme: mockUserPrefs.theme,
                notifications_enabled: mockUserPrefs.notifications_enabled,
                last_used_programming_language: mockUserPrefs.last_used_programming_language
            })
        )
    })

    it("handles errors from updateAllPrefs", async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error("Error updating all user preferences"))

        await expect(updateAllPrefs(mockUserPrefs))
                    .rejects.toThrow("Error updating all user preferences")

        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserPreferencesAPI",
            })
        )
    })

    it("updateThemePref: updates user's theme", async () => {
        mockedAxios.patch.mockImplementation(async () => ({ data: mockResponse }))

        await updateThemePref(user_id, "dark")
        
        expect(mockedAxios.patch).toHaveBeenCalledTimes(1)
        expect(mockedAxios.patch).toHaveBeenCalledWith(
            "/prefs/theme",
            expect.objectContaining({
                user_id: mockUserPrefs.user_id,
                theme: "dark"
            })
        )
    })

    it("handles errors from updateThemePref", async () => {
        mockedAxios.patch.mockRejectedValueOnce(new Error("Error updating user's theme"))

        await expect(updateThemePref(user_id, 'dark'))
                    .rejects.toThrow("Error updating user's theme")

        expect(mockedAxios.patch).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserPreferencesAPI",
            })
        )
    })

    it("updateNotifPref: updates user's notification setting", async () => {
        mockedAxios.patch.mockImplementation(async () => ({ data: mockResponse }))

        await updateNotifPref(user_id, false)
        
        expect(mockedAxios.patch).toHaveBeenCalledTimes(1)
        expect(mockedAxios.patch).toHaveBeenCalledWith(
            "/prefs/notif",
            expect.objectContaining({
                user_id: mockUserPrefs.user_id,
                notifications_enabled: false,
            })
        )
    })

    it("handles errors from updateNotifPref", async () => {
        mockedAxios.patch.mockRejectedValueOnce(new Error("Error updating user's notification setting"))

        await expect(updateNotifPref(user_id, false))
                    .rejects.toThrow("Error updating user's notification setting")

        expect(mockedAxios.patch).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserPreferencesAPI",
            })
        )
    })

    it("updateLastProgLang: updates user's last used programming language", async () => {
        mockedAxios.patch.mockImplementation(async () => ({ data: mockResponse }))

        await updateLastProgLang(user_id, 51)
        
        expect(mockedAxios.patch).toHaveBeenCalledTimes(1)
        expect(mockedAxios.patch).toHaveBeenCalledWith(
            "/prefs/prog",
            expect.objectContaining({
                user_id: mockUserPrefs.user_id,
                last_used_programming_language: 51
            })
        )
    })

    it("handles errors from updateLastProgLang", async () => {
        mockedAxios.patch.mockRejectedValueOnce(new Error("Error updating user's last programming language"))

        await expect(updateLastProgLang(user_id, 51))
                    .rejects.toThrow("Error updating user's last programming language")

        expect(mockedAxios.patch).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserPreferencesAPI",
            })
        )
    })
})
