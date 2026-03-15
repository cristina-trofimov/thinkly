import axiosClient from "../src/lib/axiosClient"
import type { MostRecentSub } from "../src/types/submissions/MostRecentSub.type"
import { updateMostRecentSub, getMostRecentSub } from "../src/api/MostRecentSubAPI"
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
        delete: jest.fn(),
    },
    API_URL: 'http://localhost:8000',
}))

jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn()
}))

const mockedLogger = logFrontend as jest.Mock
const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>

const user_question_instance_id = 123
const code = "print('Hello world')"
const lang_judge_id = 71

const mockMostRecentSub: MostRecentSub = {
        row_id: 1,
        user_question_instance_id: user_question_instance_id,
        code: code,
        lang_judge_id: lang_judge_id,
        submitted_on: new Date()
    }

const mockResponse = {
    status_code: 200,
    data: mockMostRecentSub
}


describe("Most recent submission", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("updateMostRecentSub: updates the values of the most recent submission", async () => {
        mockedAxios.put.mockImplementation(async () => ({ data: mockResponse }))

        await updateMostRecentSub(user_question_instance_id, code,lang_judge_id)
        
        expect(mockedAxios.put).toHaveBeenCalledTimes(1)
        expect(mockedAxios.put).toHaveBeenCalledWith(
            "/recent-sub/put",
            expect.objectContaining({
                user_question_instance_id: user_question_instance_id,
                code: code,
                lang_judge_id: lang_judge_id,
                submitted_on: new Date()
            })
        )
    })

    it("handles errors from updateMostRecentSub", async () => {
        mockedAxios.put.mockRejectedValueOnce(new Error("Error updating most recent submission"))

        await expect(updateMostRecentSub(-1, "", -1))
                    .rejects.toThrow("Error updating most recent submission")

        expect(mockedAxios.put).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "MostRecentSubAPI",
            })
        )
    })

    it("getMostRecentSub: returns the most recent submission associated with a given user and question instance id", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockResponse }))

        await getMostRecentSub(user_question_instance_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/recent-sub/latest", {"params": {"user_question_instance_id": user_question_instance_id}}
        )
    })

    it("handles errors from getMostRecentSub", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching most recent submission"))

        await expect(getMostRecentSub(user_question_instance_id))
                    .rejects.toThrow("Error fetching most recent submission")

        expect(mockedAxios.get).toHaveBeenCalled()
        expect(mockedLogger).toHaveBeenCalledWith(
            expect.objectContaining({
              level: "ERROR",
              component: "MostRecentSubAPI",
            })
        )
    })
})
