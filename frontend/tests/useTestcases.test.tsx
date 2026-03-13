import { renderHook, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { getTestcases } from '../src/api/QuestionsAPI'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { TestCase } from '../src/types/questions/QuestionPagination.type'


jest.mock('../src/api/QuestionsAPI', () => ({
    getTestcases: jest.fn()
}))

const mockTestcases = [
  {
    test_case_id: 1,
    question_id: 1,
    input_data: {
      a: 10,
      b: 20,
    },
    expected_output: "12"
  },
  {
    test_case_id: 2,
    question_id: 1,
    input_data: {
      x: 5,
      y: 5,
    },
    expected_output: "123"
  },
  {
    test_case_id: 3,
    question_id: 1,
    input_data: {
      k: "kjb"
    },
    expected_output: "12df"
  },
]

describe('useTestcases hooks', () => {

  it("doesn't fetches testcases if question_id is undefined", async () => {
    renderHook(() => useTestcases(undefined))

    expect(getTestcases).not.toHaveBeenCalled()
  })

  it('fetches testcases and updates loading state if question_id is provided', async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.testcases.length).toBe(3)
  })

  it('set the first case as active by default', async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activeTestcase).toBe(mockTestcases[0])
  })

  it('addTestcase and set the new case as the active case', async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.addTestcase()
    })

    expect(result.current.testcases.length).toBe(4)
    expect(result.current.activeTestcase).toEqual({
      "expected_output": "",
      "input_data": {},
      "question_id": -1,
      "test_case_id": -1,
    } as TestCase)
  })

  it('updateTestcase changes the given value if the case is found', async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.updateTestcase(mockTestcases[0], "input_data", "99")
    })

    expect(result.current.testcases[0].input_data).toEqual("99")
  })

  it('updateTestcase does nothing if the case is not found', async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.updateTestcase(undefined, "input_data", "99")
    })

    expect(result.current.testcases).toEqual(mockTestcases)
  })

  it("removeTestcase doesn't delete the case if it's the only case", async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce([
      {
        test_case_id: 1,
        question_id: 1,
        caseID: 'Case 1',
        input_data: {
          a: 10,
          b: 20,
        },
      },
    ])

    const { result } = renderHook(() => useTestcases(1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.removeTestcase(mockTestcases[0])
    })

    expect(result.current.testcases.length).toBe(1)
  })

  it("removes inactive testcase and active testcase doesn't change", async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.removeTestcase(mockTestcases[2])
    })

    expect(result.current.testcases.length).toBe(2)
    expect(result.current.testcases).toEqual([
      {
        test_case_id: 1,
        question_id: 1,
        input_data: {
          a: 10,
          b: 20,
        },
        expected_output: "12"
      },
      {
        test_case_id: 2,
        question_id: 1,
        input_data: {
          x: 5,
          y: 5,
        },
        expected_output: "123"
      },
    ])
    expect(result.current.activeTestcase).toBe(mockTestcases[0])
  })

  it('removes active testcase, renumbers the remaining, and set new active case', async () => {
    (getTestcases as jest.Mock).mockResolvedValueOnce(mockTestcases)

    const { result } = renderHook(() => useTestcases(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setActiveTestcase(mockTestcases[1])
    })

    expect(result.current.activeTestcase).toBe(mockTestcases[1])

    act(() => {
      result.current.removeTestcase(mockTestcases[1])
    })

    expect(result.current.testcases.length).toBe(2)
    expect(result.current.testcases).toEqual([
      {
        test_case_id: 1,
        question_id: 1,
        input_data: {
          a: 10,
          b: 20,
        },
        expected_output: "12"
      },
      {
        test_case_id: 3,
        question_id: 1,
        input_data: {
          k: "kjb"
        },
        expected_output: "12df"
      },
    ])
    expect(result.current.activeTestcase).toBe(mockTestcases[0])
  })
})
