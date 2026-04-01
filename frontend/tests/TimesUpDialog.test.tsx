import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TimesUpDialog } from '../src/components/codingPage/TimesUpDialog'

jest.mock('../src/components/ui/dialog', () => ({
    Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}))

describe('TimesUpDialog', () => {
    it('renders nothing when redirectCountdown is null', () => {
        render(<TimesUpDialog redirectCountdown={null} />)
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('renders the dialog when redirectCountdown is a number', () => {
        render(<TimesUpDialog redirectCountdown={5} />)
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('shows the Time\'s Up title', () => {
        render(<TimesUpDialog redirectCountdown={3} />)
        expect(screen.getByTestId('dialog-title')).toHaveTextContent("Time's Up!")
    })

    it('shows the correct countdown value', () => {
        render(<TimesUpDialog redirectCountdown={4} />)
        expect(screen.getByText('4s')).toBeInTheDocument()
    })

    it('shows countdown of 0', () => {
        render(<TimesUpDialog redirectCountdown={0} />)
        expect(screen.getByText('0s')).toBeInTheDocument()
    })

    it('shows the participation message', () => {
        render(<TimesUpDialog redirectCountdown={5} />)
        expect(screen.getByText(/thanks for participating/i)).toBeInTheDocument()
    })

    it('shows the redirect message', () => {
        render(<TimesUpDialog redirectCountdown={5} />)
        expect(screen.getByText(/redirecting you to the home page/i)).toBeInTheDocument()
    })
})
