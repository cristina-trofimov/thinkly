import axiosClient from "../src/lib/axiosClient"
import type { MostRecentSub } from "../src/types/MostRecentSub.type"
import { updateMostRecentSub, getMostRecentSub } from "../src/api/MostRecentSubAPI"

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

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>

const question_id = 1
const user_id = 1
const event_id = 1
const question_instance_id = 123
const code = "print('Hello world')"
const lang_judge_id = 71

const mockMostRecentSub: MostRecentSub = {
        user_id: user_id,
        question_instance_id: question_instance_id,
        code: code,
        lang_judge_id: lang_judge_id
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
        mockedAxios.post.mockImplementation(async () => ({ data: mockResponse }))

        const result = await updateMostRecentSub(user_id, question_instance_id, code,lang_judge_id)
        
        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
        expect(mockedAxios.post).toHaveBeenCalledWith(
            "/recent-sub/update",
            expect.objectContaining({
                user_id: user_id,
                question_instance_id: question_instance_id,
                code: code,
                lang_judge_id: lang_judge_id,
            })
        )
    })

    it("handles errors from updateMostRecentSub", async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error("Error updating most recent submission"))

        await expect(updateMostRecentSub(-1, -1, "", -1))
                    .rejects.toThrow("Error updating most recent submission")

        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })

    it("getMostRecentSub: returns the most recent submission associated with a given ", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockResponse }))

        const result = await getMostRecentSub(user_id, question_instance_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/recent-sub/latest", {"params": {"user_id": user_id, "question_instance_id": question_instance_id}}
        )
    })

    it("handles errors from getMostRecentSub", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching most recent submission"))

        await expect(getMostRecentSub(user_id, question_instance_id))
                    .rejects.toThrow("Error fetching most recent submission")

        expect(mockedAxios.get).toHaveBeenCalled()
    })
})
