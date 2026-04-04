import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SessionTimer } from '../src/components/codingPage/SessionTimer'

describe('SessionTimer', () => {
    it('renders nothing when remainingMs is null', () => {
        const { container } = render(<SessionTimer remainingMs={null} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('shows formatted time in mm:ss when under 1 hour', () => {
        render(<SessionTimer remainingMs={5 * 60 * 1000 + 30 * 1000} />) // 5:30
        expect(screen.getByText('5:30')).toBeInTheDocument()
    })

    it('shows formatted time in hh:mm:ss when 1 hour or more', () => {
        render(<SessionTimer remainingMs={2 * 3600 * 1000 + 3 * 60 * 1000 + 15 * 1000} />) // 2:03:15
        expect(screen.getByText('2:03:15')).toBeInTheDocument()
    })

    it("shows \"Time's up\" when remainingMs is 0", () => {
        render(<SessionTimer remainingMs={0} />)
        expect(screen.getByText("Time's up")).toBeInTheDocument()
    })

    it('applies destructive styles when expired', () => {
        const { container } = render(<SessionTimer remainingMs={0} />)
        expect(container.firstChild).toHaveClass('bg-destructive/10')
    })

    it('applies amber warning styles when under 5 minutes', () => {
        const { container } = render(<SessionTimer remainingMs={3 * 60 * 1000} />) // 3 min
        expect(container.firstChild).toHaveClass('bg-amber-500/10')
    })

    it('applies animate-pulse when under 1 minute and not expired', () => {
        const { container } = render(<SessionTimer remainingMs={30 * 1000} />) // 30s
        expect(container.firstChild).toHaveClass('animate-pulse')
    })

    it('does not apply animate-pulse when over 1 minute', () => {
        const { container } = render(<SessionTimer remainingMs={2 * 60 * 1000} />) // 2 min
        expect(container.firstChild).not.toHaveClass('animate-pulse')
    })

    it('does not apply animate-pulse when expired', () => {
        const { container } = render(<SessionTimer remainingMs={0} />)
        expect(container.firstChild).not.toHaveClass('animate-pulse')
    })

    it('applies default muted styles when plenty of time remains', () => {
        const { container } = render(<SessionTimer remainingMs={60 * 60 * 1000} />) // 1 hour
        expect(container.firstChild).toHaveClass('bg-muted')
    })
})
