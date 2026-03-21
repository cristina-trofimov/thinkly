import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SubmissionResult, SubmissionResultSkeleton } from '../src/components/codingPage/SubmissionResult'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Skeleton uses shadcn Skeleton — render it as a plain div so assertions work
jest.mock('../src/components/ui/skeleton', () => ({
    Skeleton: ({ className }: any) => <div data-testid="skeleton-bone" className={className} />,
}))

// TimeAgoFormat is a pure helper — stub it to a predictable string
jest.mock('../src/components/helpers/TimeAgoFormat', () => ({
    TimeAgoFormat: () => '2 hours ago',
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const baseSubmission: SubmissionType = {
    submission_id: 1,
    user_question_instance_id: 55,
    lang_judge_id: 71,
    status: 'Accepted',
    runtime: 42,
    memory: 1024,
    submitted_on: new Date('2025-03-01T10:00:00Z'),
    compile_output: null,
    stdout: null,
    stderr: null,
    message: null,
}

const makeSubmission = (overrides: Partial<SubmissionType> = {}): SubmissionType => ({
    ...baseSubmission,
    ...overrides,
})

// ─── SubmissionResultSkeleton ─────────────────────────────────────────────────

describe('SubmissionResultSkeleton', () => {
    it('renders the skeleton container', () => {
        render(<SubmissionResultSkeleton />)
        expect(screen.getByTestId('submission-result-skeleton')).toBeInTheDocument()
    })

    it('renders multiple skeleton bones', () => {
        render(<SubmissionResultSkeleton />)
        expect(screen.getAllByTestId('skeleton-bone').length).toBeGreaterThan(0)
    })
})

// ─── SubmissionResult ─────────────────────────────────────────────────────────

describe('SubmissionResult - header', () => {
    it('renders the submission result container', () => {
        render(<SubmissionResult result={makeSubmission()} />)
        expect(screen.getByTestId('submission-result')).toBeInTheDocument()
    })

    it('renders the "Submission Result" heading', () => {
        render(<SubmissionResult result={makeSubmission()} />)
        expect(screen.getByText('Submission Result')).toBeInTheDocument()
    })

    it('renders the status badge with the correct text', () => {
        render(<SubmissionResult result={makeSubmission()} />)
        expect(screen.getByTestId('submission-status-badge')).toHaveTextContent('Accepted')
    })

    it('applies green styling for Accepted status', () => {
        render(<SubmissionResult result={makeSubmission({ status: 'Accepted' })} />)
        expect(screen.getByTestId('submission-status-badge')).toHaveClass('text-green-600')
    })

    it('applies red styling for non-Accepted status', () => {
        render(<SubmissionResult result={makeSubmission({ status: 'Wrong Answer' })} />)
        expect(screen.getByTestId('submission-status-badge')).toHaveClass('text-red-600')
    })

    it('renders the correct status text for Wrong Answer', () => {
        render(<SubmissionResult result={makeSubmission({ status: 'Wrong Answer' })} />)
        expect(screen.getByTestId('submission-status-badge')).toHaveTextContent('Wrong Answer')
    })
})

describe('SubmissionResult - basic info', () => {
    it('renders runtime value', () => {
        render(<SubmissionResult result={makeSubmission({ runtime: 42 })} />)
        expect(screen.getByTestId('result-runtime')).toHaveTextContent('42 ms')
    })

    it('renders em dash when runtime is null', () => {
        render(<SubmissionResult result={makeSubmission({ runtime: null })} />)
        expect(screen.getByTestId('result-runtime')).toHaveTextContent('— ms')
    })

    it('renders memory value', () => {
        render(<SubmissionResult result={makeSubmission({ memory: 1024 })} />)
        expect(screen.getByTestId('result-memory')).toHaveTextContent('1024 KB')
    })

    it('renders em dash when memory is null', () => {
        render(<SubmissionResult result={makeSubmission({ memory: null })} />)
        expect(screen.getByTestId('result-memory')).toHaveTextContent('— KB')
    })

    it('renders the submitted_on timestamp via TimeAgoFormat', () => {
        render(<SubmissionResult result={makeSubmission()} />)
        expect(screen.getByTestId('result-submitted-on')).toHaveTextContent('2 hours ago')
    })
})

describe('SubmissionResult - additional information', () => {
    it('does not render additional info section when both message and compile_output are null', () => {
        render(<SubmissionResult result={makeSubmission({ message: null, compile_output: null })} />)
        expect(screen.queryByText('Additional Information')).not.toBeInTheDocument()
    })

    it('renders message when present', () => {
        render(<SubmissionResult result={makeSubmission({ message: 'Time Limit Exceeded' })} />)
        expect(screen.getByTestId('result-message')).toHaveTextContent('Time Limit Exceeded')
        expect(screen.getByText('Additional Information')).toBeInTheDocument()
    })

    it('renders compile_output when present', () => {
        render(<SubmissionResult result={makeSubmission({ compile_output: 'error: undeclared identifier' })} />)
        expect(screen.getByTestId('result-compile-output')).toHaveTextContent('error: undeclared identifier')
        expect(screen.getByText('Additional Information')).toBeInTheDocument()
    })

    it('renders both message and compile_output when both are present', () => {
        render(<SubmissionResult result={makeSubmission({
            message: 'Runtime Error',
            compile_output: 'Segfault',
        })} />)
        expect(screen.getByTestId('result-message')).toHaveTextContent('Runtime Error')
        expect(screen.getByTestId('result-compile-output')).toHaveTextContent('Segfault')
    })

    it('shows additional info section when only compile_output is set', () => {
        render(<SubmissionResult result={makeSubmission({ compile_output: 'build failed', message: null })} />)
        expect(screen.getByText('Additional Information')).toBeInTheDocument()
        expect(screen.queryByTestId('result-message')).not.toBeInTheDocument()
    })
})

describe('SubmissionResult - program output', () => {
    it('does not render program output section when stdout and stderr are both null', () => {
        render(<SubmissionResult result={makeSubmission({ stdout: null, stderr: null })} />)
        expect(screen.queryByText('Program Output')).not.toBeInTheDocument()
    })

    it('renders stdout when present', () => {
        render(<SubmissionResult result={makeSubmission({ stdout: 'Hello, World!' })} />)
        expect(screen.getByTestId('result-stdout')).toHaveTextContent('Hello, World!')
        expect(screen.getByText('Program Output')).toBeInTheDocument()
    })

    it('renders stderr when present', () => {
        render(<SubmissionResult result={makeSubmission({ stderr: 'Traceback (most recent call last)' })} />)
        expect(screen.getByTestId('result-stderr')).toHaveTextContent('Traceback (most recent call last)')
        expect(screen.getByText('Program Output')).toBeInTheDocument()
    })

    it('renders both stdout and stderr when both are present', () => {
        render(<SubmissionResult result={makeSubmission({
            stdout: 'partial output',
            stderr: 'runtime error',
        })} />)
        expect(screen.getByTestId('result-stdout')).toHaveTextContent('partial output')
        expect(screen.getByTestId('result-stderr')).toHaveTextContent('runtime error')
    })

    it('renders only stderr section when stdout is null', () => {
        render(<SubmissionResult result={makeSubmission({ stdout: null, stderr: 'error msg' })} />)
        expect(screen.queryByTestId('result-stdout')).not.toBeInTheDocument()
        expect(screen.getByTestId('result-stderr')).toBeInTheDocument()
    })
})

describe('SubmissionResult - empty state', () => {
    it('shows empty state when all output fields are null', () => {
        render(<SubmissionResult result={makeSubmission({
            stdout: null, stderr: null, compile_output: null, message: null,
        })} />)
        expect(screen.getByTestId('result-empty-state')).toBeInTheDocument()
        expect(screen.getByText('No additional output available')).toBeInTheDocument()
    })

    it('does not show empty state when at least one output field is set', () => {
        render(<SubmissionResult result={makeSubmission({ stdout: 'something' })} />)
        expect(screen.queryByTestId('result-empty-state')).not.toBeInTheDocument()
    })

    it('does not show empty state when only message is set', () => {
        render(<SubmissionResult result={makeSubmission({ message: 'TLE' })} />)
        expect(screen.queryByTestId('result-empty-state')).not.toBeInTheDocument()
    })
})