import { Skeleton } from '../ui/skeleton'
import { TimeAgoFormat } from '../helpers/TimeAgoFormat'
import type { SubmissionType } from '../../types/submissions/SubmissionType.type'

// ─── Skeleton that mirrors the result card layout ────────────────────────────

export const SubmissionResultSkeleton = () => (
    <div data-testid="submission-result-skeleton" className="space-y-6 animate-in fade-in duration-300">
        {/* Header row – status badge + title */}
        <div className="flex items-center gap-4 pb-4 border-b">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-7 w-48 rounded-md" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-32 rounded" />
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-4 w-28 rounded" />
                    </div>
                </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-40 rounded" />
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                </div>
            </div>
        </div>

        {/* Output section */}
        <div className="space-y-4">
            <Skeleton className="h-4 w-32 rounded" />
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-24 w-full rounded" />
                </div>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-24 w-full rounded" />
                </div>
            </div>
        </div>
    </div>
)

// ─── Inline submission result (shown after loading completes) ─────────────────

export const SubmissionResult = ({ result }: { result: SubmissionType }) => {
    const accepted = result.status === 'Accepted'

    return (
        <div data-testid="submission-result" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
                <span
                    data-testid="submission-status-badge"
                    className={`
                    px-3 py-1 rounded-full text-sm font-semibold
                    ${accepted
                        ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                        : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    }
                `}>
                    {result.status}
                </span>
                <h2 className="text-xl font-semibold">Submission Result</h2>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Left – Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Basic Information
                    </h3>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Runtime</span>
                            <span data-testid="result-runtime" className="font-mono font-medium">
                                {result.runtime ?? '—'} ms
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Memory</span>
                            <span data-testid="result-memory" className="font-mono font-medium">
                                {result.memory ?? '—'} KB
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Submitted</span>
                            <span data-testid="result-submitted-on" className="font-mono text-sm">
                                {TimeAgoFormat(new Date(result.submitted_on).toISOString())}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right – Additional Info (only if present) */}
                {(result.compile_output || result.message) && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Additional Information
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            {result.message && (
                                <div>
                                    <span className="text-muted-foreground block text-sm mb-1">Message</span>
                                    <p data-testid="result-message" className="font-mono text-sm bg-background p-2 rounded border">
                                        {result.message}
                                    </p>
                                </div>
                            )}
                            {result.compile_output && (
                                <div>
                                    <span className="text-muted-foreground block text-sm mb-1">Compile Output</span>
                                    <pre data-testid="result-compile-output" className="font-mono text-sm bg-background p-2 rounded border overflow-x-auto">
                                        {result.compile_output}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Program Output */}
            {(result.stdout || result.stderr) && (
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Program Output
                    </h3>
                    <div className="flex flex-col gap-4">
                        {result.stdout && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <span className="text-muted-foreground block text-sm mb-2">Standard Output</span>
                                <pre data-testid="result-stdout" className="font-mono text-sm bg-background p-3 rounded border overflow-auto max-h-64">
                                    {result.stdout}
                                </pre>
                            </div>
                        )}
                        {result.stderr && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <span className="text-muted-foreground block text-sm mb-2">Standard Error</span>
                                <pre data-testid="result-stderr" className="font-mono text-sm bg-red-500/5 text-red-600 dark:text-red-400 p-3 rounded border border-red-200 dark:border-red-900 overflow-auto max-h-64">
                                    {result.stderr}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!result.stdout && !result.stderr && !result.compile_output && !result.message && (
                <div data-testid="result-empty-state" className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <p className="text-base">No additional output available</p>
                    <p className="text-sm mt-1">This submission didn't produce any stdout, stderr, or error messages</p>
                </div>
            )}
        </div>
    )
}