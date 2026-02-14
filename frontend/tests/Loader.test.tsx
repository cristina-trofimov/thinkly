import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Loader from '../src/components/helpers/Loader'


describe('Loader Component', () => {

  it("doesn't render the model when isOpen is false", () => {
    render(<Loader isOpen={false} msg='' />)

    expect(screen.queryByTestId('Loader')).not.toBeInTheDocument()
  })

  it("renders the modal with 'Loading' when no message is passed ", async () => {
    render(<Loader isOpen={true} msg='' />)

    expect(screen.getByTestId('Loader')).toBeInTheDocument()
    expect(screen.getByText('L')).toBeInTheDocument()
    expect(screen.getByText('o')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('d')).toBeInTheDocument()
    expect(screen.getByText('i')).toBeInTheDocument()
    expect(screen.getByText('n')).toBeInTheDocument()
    expect(screen.getByText('g')).toBeInTheDocument()
  })

  it("renders the modal with whatever message is passed ", async () => {
    render(<Loader isOpen={true} msg='Testing' />)

    expect(screen.getByTestId('Loader')).toBeInTheDocument()
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('e')).toBeInTheDocument()
    expect(screen.getByText('s')).toBeInTheDocument()
    expect(screen.getByText('t')).toBeInTheDocument()
    expect(screen.getByText('i')).toBeInTheDocument()
    expect(screen.getByText('n')).toBeInTheDocument()
    expect(screen.getByText('g')).toBeInTheDocument()
  })
})
