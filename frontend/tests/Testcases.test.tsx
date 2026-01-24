import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTestcases } from '../src/components/helpers/useTestcases'
import Testcases from '../src/components/codingPage/Testcases'
import userEvent from '@testing-library/user-event'


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
  {
    caseID: 'Case 2',
    input_data: {
      x: 5,
    },
  },
]

const setup = () => {
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
  it('renders with a default testcase', () => {
    setup()

    expect(screen.getByTestId('trigger-Case 1')).toBeInTheDocument()
    expect(screen.getByTestId('content-Case 1')).toBeInTheDocument()
  })

  it('renders active testcase content', () => {
    setup()

    expect(screen.getByTestId('content-Case 1')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('adds a new testcase and activates it', async () => {
    const { addTestcase } = setup()

    fireEvent.click(screen.getByTestId('add-testcase-btn'))

    expect(addTestcase).toHaveBeenCalled()
    expect(screen.getByTestId('trigger-Case 2')).toBeInTheDocument()
    expect(screen.getByTestId('content-Case 2')).toBeInTheDocument()
  })

  it('sets newly added testcase as active', async () => {
    setup()

    fireEvent.click(screen.getByTestId('add-testcase-btn'))

    expect(screen.getByTestId('content-Case 2')).toBeInTheDocument()
  })

  it('switches between testcase tabs', async () => {
    setup()

    await userEvent.click(screen.getByTestId('add-testcase-btn'))

    expect(screen.getByTestId('content-Case 1')).not.toBeVisible()
    expect(screen.getByTestId('content-Case 2')).toBeVisible()

    await userEvent.click(screen.getByTestId('trigger-Case 1'))

    expect(screen.getByTestId('content-Case 1')).toBeVisible()
    expect(screen.getByTestId('content-Case 2')).not.toBeVisible()
  })

  it('updates inputs and output fields', async () => {
    const { updateTestcase } = setup()
    const inputField = screen.getByTestId('Case 1-a-input')
    
    fireEvent.change(inputField, {target: {value: '99'}})
    expect(updateTestcase).toHaveBeenCalledWith('Case 1', "input_data", "99")
    expect(inputField.ariaValueText).toBe("99")

    // fireEvent.change(inputField, {target: {value: 'ghnkjh'}})
    // expect(updateTestcase).toHaveBeenCalledWith('Case 1', "input_data", "ghnkjh")
  })

  it('removes a testcase and renumbers remaining cases', async () => {
    const { removeTestcase } = setup()
    // expect(screen.getByTestId('trigger-Case 2')).not.toBeInTheDocument()

    const addBtn = screen.getByTestId('add-testcase-btn')
    await userEvent.click(addBtn)

    fireEvent.click(screen.getByTestId('trigger-Case 1')
                          .querySelector('svg')!)

    expect(removeTestcase).toHaveBeenCalledWith("Case 1")
    // expect(screen.getByTestId('trigger-Case 2')).not.toBeInTheDocument()
    // expect(screen.getByTestId('trigger-Case 1')).toBeInTheDocument()
  })

  it('does not remove the last remaining testcase', async () => {
    setup()

    const closeBtn =
      screen.getByTestId('trigger-Case 1').parentElement?.querySelector('svg')

    await userEvent.click(closeBtn!)

    expect(screen.getByTestId('trigger-Case 1')).toBeInTheDocument()
  })
})
