import axiosClient from "../src/lib/axiosClient"
import type { BaseEvent } from "../src/types/BaseEvent.type"
import { getEventByID, getEventByName, updateEvent } from "../src/api/BaseEventAPI"

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

const user_id = 1

const mockEvent: BaseEvent = {
    event_id: 1,
    event_name: 'event name',
    event_location: null,
    question_cooldown: 5,
    event_start_date: new Date('2026-01-13 03:54:26.585121+00'),
    event_end_date: new Date('2026-01-13 03:54:26.585121+00'),
    created_at: new Date('2026-01-13 03:54:26.585121+00'),
    updated_at: new Date('2026-01-13 03:54:26.585121+00'),
}

const mockResponse = {
    status_code: 200,
    data: mockEvent
}


describe("Base events", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("getEventByID: returns event associated to an event_id", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockResponse }))

        await getEventByID(mockEvent.event_id)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/events/find", {"params": {"event_id": mockEvent.event_id }}
        )
    })

    it("handles errors from getEventByID", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching event by id"))

        await expect(getEventByID(mockEvent.event_id))
                    .rejects.toThrow("Error fetching event by id")

        expect(mockedAxios.get).toHaveBeenCalled()
    })

    it("getEventByName: returns event associated to an event_name", async () => {
        mockedAxios.get.mockImplementation(async () => ({ data: mockResponse }))

        await getEventByName(mockEvent.event_name)

        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/events/get", {"params": {"event_name": mockEvent.event_name }}
        )
    })

    it("handles errors from getEventByName", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Error fetching event by name"))

        await expect(getEventByName(mockEvent.event_name))
                    .rejects.toThrow("Error fetching event by name")

        expect(mockedAxios.get).toHaveBeenCalled()
    })

    it("updateEvent: updates event", async () => {
        mockedAxios.post.mockImplementation(async () => ({ data: mockResponse }))

        await updateEvent(mockEvent)
        
        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
        expect(mockedAxios.post).toHaveBeenCalledWith(
            "/events/update",
            expect.objectContaining({
                event_id: mockEvent.event_id,
                event_name: mockEvent.event_name,
                event_location: mockEvent.event_location,
                question_cooldown: mockEvent.question_cooldown,
                event_start_date: mockEvent.event_start_date,
                event_end_date: mockEvent.event_end_date,
                created_at: mockEvent.created_at,
                updated_at: mockEvent.updated_at,
            })
        )
    })

    it("handles errors from updateEvent", async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error("Error updating event"))

        await expect(updateEvent(mockEvent))
                    .rejects.toThrow("Error updating event")

        expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })
})
