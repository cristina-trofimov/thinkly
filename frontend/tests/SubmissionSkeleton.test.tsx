import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SubmissionSkeleton } from '../src/components/codingPage/SubmissionSkeleton'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Skeleton uses shadcn Skeleton — render it as a plain div so assertions work
jest.mock('../src/components/ui/skeleton', () => ({
    Skeleton: ({ className }: any) => <div data-testid="skeleton-bone" className={className} />,
}))

describe('SubmissionResultSkeleton', () => {
    it('renders the skeleton container', () => {
        render(<SubmissionSkeleton />)
        expect(screen.getByTestId('submission-result-skeleton')).toBeInTheDocument()
    })

    it('renders multiple skeleton bones', () => {
        render(<SubmissionSkeleton />)
        expect(screen.getAllByTestId('skeleton-bone').length).toBeGreaterThan(0)
    })
})
