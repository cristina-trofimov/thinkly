import axiosClient from "../src/lib/axiosClient"
import { submitToJudge0 } from "../src/api/Judge0API"
import { submitAttempt } from "../src/api/CodeSubmissionAPI"
import type { TestcaseType } from "../src/types/questions/Testcases.type"
import { getQuestionInstance, updateQuestionInstance } from "../src/api/QuestionInstanceAPI"
import type { Judge0Response } from "../src/types/questions/Judge0Response"
import type { QuestionInstance } from "../src/types/questions/QuestionInstance.type"

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

jest.mock('../src/api/Judge0API', () => ({
    submitToJudge0: jest.fn(() =>
      Promise.resolve({
        text: () => 'Execution success'
      })
    )
}))

jest.mock('../src/api/CodeSubmissionAPI', () => ({
    submitAttempt: jest.fn(() =>
      Promise.resolve({
        text: () => 'Successfully submitted code'
      })
    )
}))

jest.mock('../src/api/QuestionInstanceAPI', () => ({
    getQuestionInstance: jest.fn(() =>
      Promise.resolve({
        text: () => 'Question instance'
      })
    ),
    updateQuestionInstance: jest.fn(() =>
      Promise.resolve({
        text: () => 'Updated question instance'
      })
    ),
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>

// const { mockedSubmitToJudge0 } = require('../src/api/Judge0API')
// const { mockedGetQuestionInstance, mockedUpdateQuestionInstance } = require('../src/api/QuestionInstanceAPI')

const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>
const mockedGetQuestionInstance = getQuestionInstance as jest.MockedFunction<typeof getQuestionInstance>
const mockedUpdateQuestionInstance = updateQuestionInstance as jest.MockedFunction<typeof updateQuestionInstance>

// jest.mock('../src/lib/axiosClient')
// jest.mock('../src/api/Judge0API')
// jest.mock('../src/api/QuestionInstanceAPI')

// const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
// const mockedSubmitToJudge0 = submitToJudge0 as jest.MockedFunction<typeof submitToJudge0>
// const mockedGetQuestionInstance = getQuestionInstance as jest.MockedFunction<typeof getQuestionInstance>
// const mockedUpdateQuestionInstance = updateQuestionInstance as jest.MockedFunction<typeof updateQuestionInstance>

const question_id = 1
const user_id = 1
const event_id = 1
const source_code = "print('Hello')"
const language_id = "71"
const testcases: TestcaseType[] = [
  {
    test_case_id: 1,
    question_id: 1,
    input_data: {
      "nums": [2, 7, 11, 15],
      "target": 19
    },
    expected_output: "[1,2]",
    caseID: 'Case 1'
  },
  {
    test_case_id: 2,
    question_id: 1,
    input_data: {
      "nums": [2, 7],
      "target": 9
    },
    expected_output: "[0,1]",
    caseID: 'Case 2'
  },
]

const mockJudge0Response: Judge0Response = {
    stdout: "Hello\n",
    stderr: null,
    compile_output: null,
    message: null,
    status: {
        id: 3,
        description: "Accepted"
    },
    memory: "1024",
    time: "0.123",
    token: null
}

const mockQuestionInstance: QuestionInstance = {
  question_instance_id: 123,
  question_id: question_id,
  event_id: event_id,
  points: 10,
  riddle_id: null,
  is_riddle_completed: false
}

const mockSubmissionResponse = {
  status_code: 200,
  data: {
    submission_id: 456,
    user_id: user_id,
    question_instance_id: 123,
    status: "Accepted",
    memory: "1024",
    runtime: "0.123",
    submitted_on: "2026-02-22T19:30:00.000Z",
    stdout: "Hello\n",
    stderr: null,
    compile_output: null,
    message: null
  }
}

describe("Code Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("processes submission not linked to an event", async () => {
    mockedSubmitToJudge0.mockResolvedValueOnce(mockJudge0Response)
    mockedGetQuestionInstance.mockResolvedValueOnce([])
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)

    mockedAxios.post.mockResolvedValueOnce({ data: mockSubmissionResponse })

    const result = await submitAttempt(question_id, user_id, null, source_code, language_id, testcases)

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedSubmitToJudge0).toHaveBeenCalledWith(source_code, language_id, testcases)

    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()

    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance.mock.calls[0][0]).toMatchObject({
      question_id: question_id,
      event_id: null,
      points: 0,
      riddle_id: null,
      is_riddle_completed: false
    })
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/attempts/add",
      expect.objectContaining({
        user_id: user_id,
        question_instance_id: mockQuestionInstance.question_instance_id,
        status: mockJudge0Response.status.description,
        memory: mockJudge0Response.memory,
        runtime: mockJudge0Response.time,
      })
    )

    expect(result).toEqual({
      judge0Response: mockJudge0Response,
      submissionResponse: mockSubmissionResponse.data,
      questionInstance: mockQuestionInstance
    })
  })

  it("processes submission linked to an event with existing question instance", async () => {
    mockedSubmitToJudge0.mockResolvedValueOnce(mockJudge0Response)
    mockedGetQuestionInstance.mockResolvedValueOnce([mockQuestionInstance])
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)
    
    mockedAxios.post.mockResolvedValueOnce({
      data: mockSubmissionResponse
    })

    const result = await submitAttempt(question_id, user_id, event_id, source_code, language_id, testcases)

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    
    expect(mockedGetQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedGetQuestionInstance).toHaveBeenCalledWith(question_id, event_id)
    
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledWith(mockQuestionInstance)
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it("processes submission linked to an event without existing question instance", async () => {
    mockedSubmitToJudge0.mockResolvedValueOnce(mockJudge0Response)
    mockedGetQuestionInstance.mockResolvedValueOnce([])
    
    const newQuestionInstance = { ...mockQuestionInstance, question_instance_id: -1 }
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)
    
    mockedAxios.post.mockResolvedValueOnce({ data: mockSubmissionResponse })

    const result = await submitAttempt(question_id, user_id, event_id, source_code, language_id, testcases)

    expect(mockedSubmitToJudge0).toHaveBeenCalledTimes(1)
    expect(mockedGetQuestionInstance).toHaveBeenCalledTimes(1)
    
    expect(mockedUpdateQuestionInstance).toHaveBeenCalledTimes(1)
    expect(mockedUpdateQuestionInstance.mock.calls[0][0]).toMatchObject({
      question_id: question_id,
      event_id: event_id,
      points: 0,
      riddle_id: null,
      is_riddle_completed: false
    })
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
  })

  it("handles errors from Judge0 API", async () => {
    mockedSubmitToJudge0.mockRejectedValueOnce(new Error("Judge0 API error"))

    await expect(submitAttempt(question_id, user_id, null, source_code, language_id, testcases))
        .rejects.toThrow("Judge0 API error")

    expect(mockedGetQuestionInstance).not.toHaveBeenCalled()
    expect(mockedUpdateQuestionInstance).not.toHaveBeenCalled()
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it("handles errors from submission API", async () => {
    mockedSubmitToJudge0.mockResolvedValueOnce(mockJudge0Response)
    mockedGetQuestionInstance.mockResolvedValueOnce([])
    mockedUpdateQuestionInstance.mockResolvedValueOnce(mockQuestionInstance)

    mockedAxios.post.mockRejectedValueOnce(new Error("Submission API error"))

    await expect(submitAttempt(question_id, user_id, null, source_code, language_id, testcases))
        .rejects.toThrow("Submission API error")
  })
})




// import axiosClient from "../src/lib/axiosClient"
// import { submitToJudge0 } from "../src/api/Judge0API"
// import { submitAttempt } from "../src/api/CodeSubmissionAPI"
// import type { TestcaseType } from "../src/types/questions/Testcases.type"
// import { getQuestionInstance, updateQuestionInstance } from "../src/api/QuestionInstanceAPI"


// jest.mock('../src/lib/axiosClient', () => ({
//   __esModule: true,
//   default: {
//     get: jest.fn(),
//     post: jest.fn(),
//     put: jest.fn(),
//     delete: jest.fn(),
//   },
//   API_URL: 'http://localhost:8000',
// }))

// jest.mock('../src/api/Judge0API', () => ({
//     submitToJudge0: jest.fn(() =>
//       Promise.resolve({
//         text: () => 'Execution success'
//       })
//     )
// }))

// jest.mock('../src/api/CodeSubmissionAPI', () => ({
//     submitAttempt: jest.fn(() =>
//       Promise.resolve({
//         text: () => 'Successfully submitted code'
//       })
//     )
// }))

// jest.mock('../src/api/QuestionInstanceAPI', () => ({
//     getQuestionInstance: jest.fn(() =>
//       Promise.resolve({
//         text: () => 'Question instance'
//       })
//     ),
//     updateQuestionInstance: jest.fn(() =>
//       Promise.resolve({
//         text: () => 'Updated question instance'
//       })
//     ),
// }))

// const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
// const question_id = 1
// const user_id = 1
// const event_id = 1
// const source_code = "print('Hello')"
// const language_id = "71"
// const testcases: TestcaseType[] = [
//   {
//     test_case_id: 1,
//     question_id: 1,
//     input_data: {
//       "nums": [2, 7, 11, 15],
//       "target": 19
//       },
//     expected_output: "[1,2]",
//     caseID: 'Case 1'
//   },
//   {
//     test_case_id: 2,
//     question_id: 1,
//     input_data: {
//       "nums": [2, 7],
//       "target": 9
//       },
//     expected_output: "[0,1]",
//     caseID: 'Case 2'
//   },
// ]

// describe("Code Submission", () => {
//   beforeEach(() => {
//     jest.clearAllMocks()
//   })


//   it("processes submission not linked to an event", async () => {
//     const { judge0Response, submissionResponse } = await submitAttempt(question_id, user_id, null, source_code, language_id, testcases)
    
//     // mockedAxios.post.mockResolvedValueOnce({
//     //     judge0Response: null,
//     //     submissionResponse: {
//     //     status_code: 200,
//     //     message: "message",
//     // },
//     // questionInstance: null
//     // })

//     // const result = await submitToJudge0(code, language_id, []);

//     expect(submitToJudge0).toHaveBeenCalledTimes(1)
//     expect(updateQuestionInstance).toHaveBeenCalledTimes(1)
//     expect(mockedAxios.post).toHaveBeenCalledTimes(1)
//   })

// //   it("submit to judge0 and returns final output", async () => {
// //     const { stdin, expected_output } = parse_input_output(testcases)
    
// //     mockedAxios.post.mockResolvedValueOnce({
// //       data: { 
// //         source_code: code,
// //         language_id: language_id,
// //         stdin: stdin,
// //         expected_output: expected_output,
// //        },
// //     })

// //     const result = await submitToJudge0(code, language_id, []);

// //     expect(mockedAxios.post).toHaveBeenCalledTimes(1)
// //   })

// //   it("throws error if axios fails", async () => {
// //     mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));
// //     await expect(submitToJudge0('print("Hello', '71', testcases))
// //       .rejects.toThrow("Network error")
// //   })
// })
