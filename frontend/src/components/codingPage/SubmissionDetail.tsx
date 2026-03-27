import type { SubmissionType } from "@/types/submissions/SubmissionType.type"
import { TimeAgoFormat } from "../helpers/TimeAgoFormat"
import { Button } from "../ui/button"

export const SubmissionDetail = ({ submission, goBack }:
    { submission: SubmissionType, goBack?: () => void }) => {
    const badgeColor = submission.status === 'Accepted' ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" 
                                 : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"

    return (
        <div data-testid="submission-result" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* Header */}
            {goBack
                ? (<div className='flex items-center gap-6 pb-4 border-b border-primary' >
                        <Button data-testid="back-btn" size='sm'
                            className='gap-2' onClick={goBack} variant="outline"
                        >
                            ← Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold">Submission Details</h2>
                            <span className={`ml-12 px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}>
                                {submission.status}
                            </span>
                        </div>
                    </div>)
                : (<div className="flex items-center gap-4 pb-4 border-b">
                        <span data-testid="submission-status-badge"
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeColor}`}>
                                    {submission.status}
                        </span>
                        <h2 className="text-xl font-semibold">Submission Result</h2>
                    </div>)
            }

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
                                {submission.runtime ?? '—'} ms
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Memory</span>
                            <span data-testid="result-memory" className="font-mono font-medium">
                                {submission.memory ?? '—'} KB
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Submitted</span>
                            <span data-testid="result-submitted-on" className="font-mono text-sm">
                                {TimeAgoFormat(new Date(submission.submitted_on).toISOString())}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right – Additional Info (only if present) */}
                {(submission.compile_output || submission.message) && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Additional Information
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            {submission.message && (
                                <div>
                                    <span className="text-muted-foreground block text-sm mb-1">Message</span>
                                    <p data-testid="result-message" className="font-mono text-sm bg-background p-2 rounded border">
                                        {submission.message}
                                    </p>
                                </div>
                            )}
                            {submission.compile_output && (
                                <div>
                                    <span className="text-muted-foreground block text-sm mb-1">Compile Output</span>
                                    <pre data-testid="result-compile-output" className="font-mono text-sm bg-background p-2 rounded border overflow-x-auto">
                                        {submission.compile_output}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Program Output */}
            {(submission.stdout || submission.stderr) && (
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Program Output
                    </h3>
                    <div className="flex flex-col gap-4">
                        {submission.stdout && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <span className="text-muted-foreground block text-sm mb-2">Standard Output</span>
                                <pre data-testid="result-stdout" className="font-mono text-sm bg-background p-3 rounded border overflow-auto max-h-64">
                                    {submission.stdout}
                                </pre>
                            </div>
                        )}
                        {submission.stderr && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <span className="text-muted-foreground block text-sm mb-2">Standard Error</span>
                                <pre data-testid="result-stderr" className="font-mono text-sm bg-red-500/5 text-red-600 dark:text-red-400 p-3 rounded border border-red-200 dark:border-red-900 overflow-auto max-h-64">
                                    {submission.stderr}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!submission.stdout && !submission.stderr && !submission.compile_output && !submission.message && (
                <div data-testid="result-empty-state" className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <p className="text-base">No additional output available</p>
                    <p className="text-sm mt-1">This submission didn't produce any stdout, stderr, or error messages</p>
                </div>
            )}
        </div>
    )
}
