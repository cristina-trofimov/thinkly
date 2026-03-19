import axiosClient from "../src/lib/axiosClient"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"
import { getQuestionInstance, getAllQuestionInstancesByEventID, putQuestionInstance } from "../src/api/QuestionInstanceAPI"
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

const question_id = 1
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

    it("putQuestionInstance: updates the values of the given (defined) question instance", async () => {
        mockedAxios.put.mockImplementation(async () => ({ data: mockGetResponse }))

        await putQuestionInstance(
            mockQuestionInstances[0].question_instance_id,
            mockQuestionInstances[0].question_id,
            mockQuestionInstances[0].event_id,
            mockQuestionInstances[0].riddle_id
        )
        
        expect(mockedAxios.put).toHaveBeenCalledTimes(1)
        expect(mockedAxios.put).toHaveBeenCalledWith(
            "/instances/put",
            expect.objectContaining({
                question_instance_id: mockQuestionInstances[0].question_instance_id,
                question_id: mockQuestionInstances[0].question_id,
                event_id: mockQuestionInstances[0].event_id,
                riddle_id: mockQuestionInstances[0].riddle_id
            })
        )
    })

    it("putQuestionInstance: throws an error if the given question is undefined", async () => {
        await expect(putQuestionInstance(
            mockQuestionInstances[0].question_instance_id,
            undefined,
            mockQuestionInstances[0].event_id,
            mockQuestionInstances[0].riddle_id
        )).rejects.toThrow("Question cannot be undefined")
        expect(mockedAxios.put).toHaveBeenCalledTimes(0)
    })

    it("handles errors from putQuestionInstance", async () => {
        mockedAxios.put.mockRejectedValueOnce(new Error("Error updating question instance"))

        await expect(putQuestionInstance(
            mockQuestionInstances[0].question_instance_id,
            mockQuestionInstances[0].question_id,
            mockQuestionInstances[0].event_id,
            mockQuestionInstances[0].riddle_id
        )).rejects.toThrow("Error updating question instance")

        expect(mockedAxios.put).toHaveBeenCalledTimes(1)
        expect(mockedLogger).toHaveBeenCalledTimes(1)
    })

    it("getQuestionInstance: returns the instance associated to a question and an event", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockUpdateResponse }))

        await getQuestionInstance(question_id, event_id)

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
        expect(mockedLogger).toHaveBeenCalledTimes(1)
    })

    it("getAllQuestionInstancesByEventID: returns a list of the instances associated to an event", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: [mockQuestionInstances[0]] }))

        await getAllQuestionInstancesByEventID(event_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/instances/by-event", {"params": { "event_id": event_id }}
        )
    })

    it("handles errors from getAllQuestionInstancesByEventID", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching question instances for an event"))

        await expect(getAllQuestionInstancesByEventID(event_id))
                    .rejects.toThrow("Error fetching question instances for an event")

        expect(mockedAxios.get).toHaveBeenCalled()
        expect(mockedLogger).toHaveBeenCalledTimes(1)
    })
})
