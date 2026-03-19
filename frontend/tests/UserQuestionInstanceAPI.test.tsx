import axiosClient from "../src/lib/axiosClient"
import type { UserQuestionInstance } from "../src/types/submissions/UserQuestionInstance.type"
import { putUserInstance, getUserInstance } from "../src/api/UserQuestionInstanceAPI"
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
const question_instance_id = 1

const userQuestionInstance: UserQuestionInstance = {
    user_question_instance_id: 123,
    user_id: user_id,
    question_instance_id: question_instance_id,
    points: 100,
    riddle_complete: null,
    lapse_time: 1245,
    attempts: 12
}

const mockResponse = {
    status_code: 200,
    data: userQuestionInstance
}


describe("User question instance", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("getUserInstance: returns user's question instance associated with a given user_id and question instance", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockResponse }))

        await getUserInstance(user_id, question_instance_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/user-instances/instance", {"params": 
            { "user_id": user_id, "question_instance_id": question_instance_id
        }})
    })

    it("handles errors from getUserInstance", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching user's question instance"))

        await expect(getUserInstance(user_id, question_instance_id))
                    .rejects.toThrow("Error fetching user's question instance")

        expect(mockedAxios.get).toHaveBeenCalled()
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserQuestionInstanceAPI",
            })
        )
    })

    it("putUserInstance: updates a user's question instance", async () => {
        mockedAxios.put.mockImplementation(async () => ({ data: mockResponse }))

        await putUserInstance(userQuestionInstance)
        
        expect(mockedAxios.put).toHaveBeenCalledTimes(1)
        expect(mockedAxios.put).toHaveBeenCalledWith(
            "/user-instances/put",
            expect.objectContaining({
                user_id: user_id,
                question_instance_id: question_instance_id,
                points: userQuestionInstance.points,
                riddle_complete: userQuestionInstance.riddle_complete,
                lapse_time: userQuestionInstance.lapse_time,
                attempts: userQuestionInstance.attempts
            })
        )
    })

    it("handles errors from updateAllPrefs", async () => {
        mockedAxios.put.mockRejectedValueOnce(new Error("Error updating a user's question instance"))

        await expect(putUserInstance(userQuestionInstance))
                    .rejects.toThrow("Error updating a user's question instance")

        expect(mockedAxios.put).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "UserQuestionInstanceAPI",
            })
        )
    })
})
