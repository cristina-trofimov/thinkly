import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTestcases } from '../src/components/helpers/useTestcases'
import Testcases from '../src/components/codingPage/Testcases'


jest.mock('../src/components/helpers/useTestcases')

const mockUseTestcases = useTestcases as jest.Mock

const mockTestcases = [
  {
    caseID: 'Case 1',
    input_data: {
      a: 10,
      b: 20,
    },
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
    expect(screen.getByTestId('content-Case 1')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByTestId('Case 1-b-input')).toHaveValue("20")
  })

  it('calls addTestcase when clicking on add button and adds the tab button', async () => {
    const { addTestcase } = setupCases()

    fireEvent.click(screen.getByTestId('add-testcase-btn'))

    expect(addTestcase).toHaveBeenCalled()
  })

  it('calls updateTestcase when an input field is changed', async () => {
    const { updateTestcase } = setupCases()
    const inputField = screen.getByTestId('Case 1-a-input')
    
    fireEvent.change(inputField, {target: {value: '99'}})
    expect(updateTestcase).toHaveBeenCalledWith('Case 1', "input_data", "99")
  })

  it('calls removeTestcase when clicking on X svg', async () => {
    const { removeTestcase } = setupCases()
    
    fireEvent.click(screen.getByTestId('trigger-Case 1')
                          .querySelector('svg')!)

    expect(removeTestcase).toHaveBeenCalledWith("Case 1")
  })

  it("does not remove the testcase when it's the only one", async () => {
    setupCases()

    fireEvent.click(screen.getByTestId('trigger-Case 1')
                          .querySelector('svg')!)

    expect(screen.getByTestId('trigger-Case 1')).toBeInTheDocument()
  })
})
