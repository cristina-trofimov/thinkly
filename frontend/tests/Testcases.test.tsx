import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTestcases } from '../src/components/helpers/useTestcases'
import Testcases from '../src/components/codingPage/Testcases'

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
jest.mock('../src/components/helpers/useTestcases')

const mockUseTestcases = useTestcases as jest.Mock

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
]

const setupCases = () => {
  const addTestcase = jest.fn()
  const removeTestcase = jest.fn()
  const updateTestcase = jest.fn()
  const setActiveTestcase = jest.fn()

  mockUseTestcases.mockReturnValue({
    testcases: mockTestcases,
    addTestcase,
    removeTestcase,
    updateTestcase,
    loading: false,
    activeTestcase: 'Case 1',
    setActiveTestcase,
  })

  render(<Testcases question_id={123} />)

  return {
    addTestcase,
    removeTestcase,
    updateTestcase,
    setActiveTestcase,
  }
}


describe('Testcases Component', () => {

  it('renders active testcase content and their inputs', () => {
    setupCases()

    expect(screen.getByText('Case 1')).toBeInTheDocument()
    expect(screen.getByTestId('content-1')).toBeInTheDocument()
  })

  it('calls addTestcase when clicking on add button and adds the tab button', async () => {
    const { addTestcase } = setupCases()

    fireEvent.click(screen.getByTestId('add-testcase-btn'))

    expect(addTestcase).toHaveBeenCalled()
  })

  it('calls removeTestcase when clicking on X svg', async () => {
    const { removeTestcase } = setupCases()
    
    fireEvent.click(screen.getByTestId('trigger-case-1')
                          .querySelector('svg')!)

    expect(removeTestcase).toHaveBeenCalledWith(mockTestcases[0])
  })

  it("does not remove the testcase when it's the only one", async () => {
    setupCases()

    fireEvent.click(screen.getByTestId('trigger-case-1')
                          .querySelector('svg')!)

    expect(screen.getByTestId('trigger-case-1')).toBeInTheDocument()
  })
})
