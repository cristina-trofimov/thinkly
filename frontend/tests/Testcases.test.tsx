import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Testcases from '../src/components/codingPage/Testcases'

describe('Testcases Component', () => {
  it('renders with a default testcase', () => {
    render(<Testcases />)

    expect(screen.getByTestId('trigger-Case 1')).toBeInTheDocument()
    expect(screen.getByTestId('content-Case 1')).toBeInTheDocument()
  })

  it('adds a new testcase and activates it', async () => {
    render(<Testcases />)

    const addBtn = screen.getByRole('button')
    await userEvent.click(addBtn)

    expect(screen.getByTestId('trigger-Case 2')).toBeInTheDocument()
    expect(screen.getByTestId('content-Case 2')).toBeInTheDocument()
  })

  it('switches between testcase tabs', async () => {
    render(<Testcases />)

    await userEvent.click(screen.getByRole('button')) // add Case 2
    await userEvent.click(screen.getByTestId('trigger-Case 1'))

    expect(screen.getByTestId('content-Case 1')).toBeVisible()
  })

  it('updates inputs and output fields', async () => {
    render(<Testcases />)

    const inputField = screen.getAllByRole('textbox')[0]
    const outputField = screen.getAllByRole('textbox')[1]

    await userEvent.type(inputField, '1 2 3')
    await userEvent.type(outputField, '6')

    expect(inputField).toHaveValue('1 2 3')
    expect(outputField).toHaveValue('6')
  })

  it('removes a testcase and renumbers remaining cases', async () => {
    render(<Testcases />)

    // Add Case 2 and Case 3
    const addBtn = screen.getByRole('button')
    await userEvent.click(addBtn)
    await userEvent.click(addBtn)

    expect(screen.getByTestId('trigger-Case 3')).toBeInTheDocument()

    // Remove Case 2
    const removeIcons = screen.getAllByTestId(/trigger-Case/)
    const case2CloseBtn =
      screen.getByTestId('trigger-Case 2').parentElement?.querySelector('svg')

    expect(case2CloseBtn).toBeInTheDocument()
    await userEvent.click(case2CloseBtn!)

    // Case 3 should now be renamed to Case 2
    expect(screen.queryByTestId('trigger-Case 3')).not.toBeInTheDocument()
    expect(screen.getByTestId('trigger-Case 2')).toBeInTheDocument()
  })

  it('does not remove the last remaining testcase', async () => {
    render(<Testcases />)

    const closeBtn =
      screen.getByTestId('trigger-Case 1').parentElement?.querySelector('svg')

    await userEvent.click(closeBtn!)

    // Still exists
    expect(screen.getByTestId('trigger-Case 1')).toBeInTheDocument()
  })

  it('sets newly added testcase as active', async () => {
    render(<Testcases />)

    await userEvent.click(screen.getByRole('button'))

    const activeContent = screen.getByTestId('content-Case 2')
    expect(activeContent).toBeVisible()
  })
})
