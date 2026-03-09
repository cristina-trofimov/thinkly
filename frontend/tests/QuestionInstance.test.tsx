import axiosClient from "../src/lib/axiosClient"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"
import { getQuestionInstance, updateQuestionInstance } from "../src/api/QuestionInstanceAPI"

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

const mockQuestionInstances: QuestionInstance[] = [
    {
        question_instance_id: 123,
        question_id: question_id,
        event_id: event_id,
        riddle_id: null
    },
    {
        question_instance_id: 334,
        question_id: question_id,
        event_id: 2,
        riddle_id: null
    }
]

const mockGetResponse = {
    status_code: 200,
    data: [
        {
            question_instance_id: 123,
            question_id: question_id,
            event_id: event_id,
            riddle_id: null
        },
        {
            question_instance_id: 334,
            question_id: question_id,
            event_id: 2,
            riddle_id: null
        }
    ]
  }

const mockUpdateResponse = {
    status_code: 200,
    data: {
        question_instance_id: 123,
        question_id: question_id,
        event_id: event_id,
        riddle_id: null
    }
  }

describe("Question Instance", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("updateQuestionInstance: updates the values of the given (defined) question instance", async () => {
        mockedAxios.post.mockImplementation(async () => ({ data: mockGetResponse }))

        const result = await updateQuestionInstance(mockQuestionInstances[0])
        
        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
        expect(mockedAxios.post).toHaveBeenCalledWith(
            "/instances/update",
            expect.objectContaining({
                question_id: mockQuestionInstances[0].question_id,
                event_id: mockQuestionInstances[0].event_id,
                riddle_id: mockQuestionInstances[0].riddle_id
            })
        )
    })

    it("updateQuestionInstance: throws an error if the given question instance is undefined", async () => {
        await expect(updateQuestionInstance(undefined))
                    .rejects.toThrow("Question instance cannot be undefined")
        expect(mockedAxios.post).toHaveBeenCalledTimes(0)
    })

    it("handles errors from updateQuestionInstance", async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error("Error updating question instance"))

        await expect(updateQuestionInstance(mockQuestionInstances[0]))
                    .rejects.toThrow("Error updating question instance")

        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })

    it("getQuestionInstance: returns a list of the instances associated between a question and an event", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockUpdateResponse }))

        const result = await getQuestionInstance(question_id, event_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/instances/find", {"params": {"event_id": event_id, "question_id": question_id}}
        )
    })

    it("handles errors from getQuestionInstance", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching question instance"))

        await expect(getQuestionInstance(question_id, event_id))
                    .rejects.toThrow("Error fetching question instance")

        expect(mockedAxios.get).toHaveBeenCalled()
    })
})
