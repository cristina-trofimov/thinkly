import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SubmissionDetail } from '../src/components/codingPage/SubmissionDetail'
import { SubmissionType } from '../src/types/submissions/SubmissionType.type'
import { beforeEach, describe } from 'node:test'

// ─── Mocks ───────────────────────────────────────────────────────────────────

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

const mockGoback = jest.fn()

// ─── SubmissionDetail ─────────────────────────────────────────────────────────

describe("SubmissionDetail - without an existing submission", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Header', () => {
        it('renders the header with the necessary parts (result container, title, status, etc.)', () => {
            render(<SubmissionDetail submission={makeSubmission()} />)
            expect(screen.getByTestId('submission-result')).toBeInTheDocument()
            expect(screen.getByText('Submission Result')).toBeInTheDocument()
            expect(screen.queryByTestId('back-btn')).not.toBeInTheDocument()
            expect(screen.queryByTestId('Submission Details')).not.toBeInTheDocument()
        })

        it('show status and applies green styling for Accepted status', () => {
            render(<SubmissionDetail submission={makeSubmission({ status: 'Accepted' })} />)
            expect(screen.getByTestId('submission-status-badge')).toHaveTextContent('Accepted')
            expect(screen.getByTestId('submission-status-badge')).toHaveClass('text-green-600')
            expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument()
            expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument()
        })

        it('show status and applies red styling for non-Accepted status', () => {
            render(<SubmissionDetail submission={makeSubmission({ status: 'Wrong Answer' })} />)
            expect(screen.getByTestId('submission-status-badge')).toHaveTextContent('Wrong Answer')
            expect(screen.getByTestId('submission-status-badge')).toHaveClass('text-red-600')
            expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument()
            expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument()
        })
    })

    describe('Basic info', () => {
        it('renders runtime value', () => {
            render(<SubmissionDetail submission={makeSubmission({ runtime: 42 })} />)
            expect(screen.getByTestId('result-runtime')).toHaveTextContent('42 ms')
        })

        it('renders em dash when runtime is null', () => {
            render(<SubmissionDetail submission={makeSubmission({ runtime: null })} />)
            expect(screen.getByTestId('result-runtime')).toHaveTextContent('— ms')
        })

        it('renders memory value', () => {
            render(<SubmissionDetail submission={makeSubmission({ memory: 1024 })} />)
            expect(screen.getByTestId('result-memory')).toHaveTextContent('1024 KB')
        })

        it('renders em dash when memory is null', () => {
            render(<SubmissionDetail submission={makeSubmission({ memory: null })} />)
            expect(screen.getByTestId('result-memory')).toHaveTextContent('— KB')
        })

        it('renders the submitted_on timestamp via TimeAgoFormat', () => {
            render(<SubmissionDetail submission={makeSubmission()} />)
            expect(screen.getByTestId('result-submitted-on')).toHaveTextContent('2 hours ago')
        })
    })

    describe('Additional information', () => {
        it('does not render additional info section when both message and compile_output are null', () => {
            render(<SubmissionDetail submission={makeSubmission({ message: null, compile_output: null })} />)
            expect(screen.queryByText('Additional Information')).not.toBeInTheDocument()
        })

        it('renders message when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ message: 'Time Limit Exceeded' })} />)
            expect(screen.getByTestId('result-message')).toHaveTextContent('Time Limit Exceeded')
            expect(screen.getByText('Additional Information')).toBeInTheDocument()
        })

        it('renders compile_output when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ compile_output: 'error: undeclared identifier' })} />)
            expect(screen.getByTestId('result-compile-output')).toHaveTextContent('error: undeclared identifier')
            expect(screen.getByText('Additional Information')).toBeInTheDocument()
        })

        it('renders both message and compile_output when both are present', () => {
            render(<SubmissionDetail submission={makeSubmission({
                message: 'Runtime Error',
                compile_output: 'Segfault',
            })} />)
            expect(screen.getByTestId('result-message')).toHaveTextContent('Runtime Error')
            expect(screen.getByTestId('result-compile-output')).toHaveTextContent('Segfault')
        })

        it('shows additional info section when only compile_output is set', () => {
            render(<SubmissionDetail submission={makeSubmission({ compile_output: 'build failed', message: null })} />)
            expect(screen.getByText('Additional Information')).toBeInTheDocument()
            expect(screen.queryByTestId('result-message')).not.toBeInTheDocument()
        })
    })

    describe('Program output', () => {
        it('does not render program output section when stdout and stderr are both null', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: null, stderr: null })} />)
            expect(screen.queryByText('Program Output')).not.toBeInTheDocument()
        })

        it('renders stdout when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: 'Hello, World!' })} />)
            expect(screen.getByTestId('result-stdout')).toHaveTextContent('Hello, World!')
            expect(screen.getByText('Program Output')).toBeInTheDocument()
        })

        it('renders stderr when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ stderr: 'Traceback (most recent call last)' })} />)
            expect(screen.getByTestId('result-stderr')).toHaveTextContent('Traceback (most recent call last)')
            expect(screen.getByText('Program Output')).toBeInTheDocument()
        })

        it('renders both stdout and stderr when both are present', () => {
            render(<SubmissionDetail submission={makeSubmission({
                stdout: 'partial output',
                stderr: 'runtime error',
            })} />)
            expect(screen.getByTestId('result-stdout')).toHaveTextContent('partial output')
            expect(screen.getByTestId('result-stderr')).toHaveTextContent('runtime error')
        })

        it('renders only stderr section when stdout is null', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: null, stderr: 'error msg' })} />)
            expect(screen.queryByTestId('result-stdout')).not.toBeInTheDocument()
            expect(screen.getByTestId('result-stderr')).toBeInTheDocument()
        })
    })

    describe('Empty state', () => {
        it('shows empty state when all output fields are null', () => {
            render(<SubmissionDetail submission={makeSubmission({
                stdout: null, stderr: null, compile_output: null, message: null,
            })} />)
            expect(screen.getByTestId('result-empty-state')).toBeInTheDocument()
            expect(screen.getByText('No additional output available')).toBeInTheDocument()
        })

        it('does not show empty state when at least one output field is set', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: 'something' })} />)
            expect(screen.queryByTestId('result-empty-state')).not.toBeInTheDocument()
        })

        it('does not show empty state when only message is set', () => {
            render(<SubmissionDetail submission={makeSubmission({ message: 'TLE' })} />)
            expect(screen.queryByTestId('result-empty-state')).not.toBeInTheDocument()
        })
    })
})

describe("SubmissionDetail - with an existing submission", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Header', () => {
        it('renders the header with the necessary parts (result container, title, status, etc.)', () => {
            render(<SubmissionDetail submission={makeSubmission()} goBack={mockGoback} />)
            expect(screen.getByTestId('submission-result')).toBeInTheDocument()
            expect(screen.queryByText('Submission Result')).not.toBeInTheDocument()
            expect(screen.getByTestId('back-btn')).toBeInTheDocument()
            expect(screen.getByText('Submission Details')).toBeInTheDocument()
        })

        it('show status and applies green styling for Accepted status', () => {
            render(<SubmissionDetail submission={makeSubmission({ status: 'Accepted' })} goBack={mockGoback} />)
            expect(screen.getByTestId('status-badge')).toHaveTextContent('Accepted')
            expect(screen.getByTestId('status-badge')).toHaveClass('text-green-600')
            expect(screen.queryByTestId('submission-status-badge')).not.toBeInTheDocument()
            expect(screen.queryByTestId('submission-status-badge')).not.toBeInTheDocument()
        })

        it('show status and applies red styling for non-Accepted status', () => {
            render(<SubmissionDetail submission={makeSubmission({ status: 'Wrong Answer' })} goBack={mockGoback} />)
            expect(screen.getByTestId('status-badge')).toHaveTextContent('Wrong Answer')
            expect(screen.getByTestId('status-badge')).toHaveClass('text-red-600')
            expect(screen.queryByTestId('submission-status-badge')).not.toBeInTheDocument()
            expect(screen.queryByTestId('submission-status-badge')).not.toBeInTheDocument()
        })
    })

    describe('Basic info', () => {
        it('renders runtime value', () => {
            render(<SubmissionDetail submission={makeSubmission({ runtime: 42 })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-runtime')).toHaveTextContent('42 ms')
        })

        it('renders em dash when runtime is null', () => {
            render(<SubmissionDetail submission={makeSubmission({ runtime: null })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-runtime')).toHaveTextContent('— ms')
        })

        it('renders memory value', () => {
            render(<SubmissionDetail submission={makeSubmission({ memory: 1024 })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-memory')).toHaveTextContent('1024 KB')
        })

        it('renders em dash when memory is null', () => {
            render(<SubmissionDetail submission={makeSubmission({ memory: null })}  goBack={mockGoback} />)
            expect(screen.getByTestId('result-memory')).toHaveTextContent('— KB')
        })

        it('renders the submitted_on timestamp via TimeAgoFormat', () => {
            render(<SubmissionDetail submission={makeSubmission()} goBack={mockGoback} />)
            expect(screen.getByTestId('result-submitted-on')).toHaveTextContent('2 hours ago')
        })
    })

    describe('Additional information', () => {
        it('does not render additional info section when both message and compile_output are null', () => {
            render(<SubmissionDetail submission={makeSubmission({ message: null, compile_output: null })} goBack={mockGoback} />)
            expect(screen.queryByText('Additional Information')).not.toBeInTheDocument()
        })

        it('renders message when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ message: 'Time Limit Exceeded' })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-message')).toHaveTextContent('Time Limit Exceeded')
            expect(screen.getByText('Additional Information')).toBeInTheDocument()
        })

        it('renders compile_output when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ compile_output: 'error: undeclared identifier' })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-compile-output')).toHaveTextContent('error: undeclared identifier')
            expect(screen.getByText('Additional Information')).toBeInTheDocument()
        })

        it('renders both message and compile_output when both are present', () => {
            render(<SubmissionDetail submission={makeSubmission({
                message: 'Runtime Error',
                compile_output: 'Segfault',
            })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-message')).toHaveTextContent('Runtime Error')
            expect(screen.getByTestId('result-compile-output')).toHaveTextContent('Segfault')
        })

        it('shows additional info section when only compile_output is set', () => {
            render(<SubmissionDetail submission={makeSubmission({ compile_output: 'build failed', message: null })} goBack={mockGoback} />)
            expect(screen.getByText('Additional Information')).toBeInTheDocument()
            expect(screen.queryByTestId('result-message')).not.toBeInTheDocument()
        })
    })

    describe('Program output', () => {
        it('does not render program output section when stdout and stderr are both null', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: null, stderr: null })} goBack={mockGoback} />)
            expect(screen.queryByText('Program Output')).not.toBeInTheDocument()
        })

        it('renders stdout when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: 'Hello, World!' })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-stdout')).toHaveTextContent('Hello, World!')
            expect(screen.getByText('Program Output')).toBeInTheDocument()
        })

        it('renders stderr when present', () => {
            render(<SubmissionDetail submission={makeSubmission({ stderr: 'Traceback (most recent call last)' })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-stderr')).toHaveTextContent('Traceback (most recent call last)')
            expect(screen.getByText('Program Output')).toBeInTheDocument()
        })

        it('renders both stdout and stderr when both are present', () => {
            render(<SubmissionDetail submission={makeSubmission({
                stdout: 'partial output',
                stderr: 'runtime error',
            })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-stdout')).toHaveTextContent('partial output')
            expect(screen.getByTestId('result-stderr')).toHaveTextContent('runtime error')
        })

        it('renders only stderr section when stdout is null', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: null, stderr: 'error msg' })} goBack={mockGoback} />)
            expect(screen.queryByTestId('result-stdout')).not.toBeInTheDocument()
            expect(screen.getByTestId('result-stderr')).toBeInTheDocument()
        })
    })

    describe('Empty state', () => {
        it('shows empty state when all output fields are null', () => {
            render(<SubmissionDetail submission={makeSubmission({
                stdout: null, stderr: null, compile_output: null, message: null,
            })} goBack={mockGoback} />)
            expect(screen.getByTestId('result-empty-state')).toBeInTheDocument()
            expect(screen.getByText('No additional output available')).toBeInTheDocument()
        })

        it('does not show empty state when at least one output field is set', () => {
            render(<SubmissionDetail submission={makeSubmission({ stdout: 'something' })} goBack={mockGoback} />)
            expect(screen.queryByTestId('result-empty-state')).not.toBeInTheDocument()
        })

        it('does not show empty state when only message is set', () => {
            render(<SubmissionDetail submission={makeSubmission({ message: 'TLE' })} goBack={mockGoback} />)
            expect(screen.queryByTestId('result-empty-state')).not.toBeInTheDocument()
        })
    })
})