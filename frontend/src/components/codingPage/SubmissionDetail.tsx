import { Button } from '../ui/button'
import { TimeAgoFormat } from '../helpers/TimeAgoFormat'
import type { SubmissionType } from '@/types/submissions/SubmissionType.type'

const SubmissionDetail = (
    { selectedSubmission, goBack } 
: { selectedSubmission: SubmissionType, goBack: () => void }) => {
    return (
        <div className='space-y-6' >
            <div className='flex flex-col gap-3'>
                <div className='flex items-center gap-4 pb-4 border-b' >
                    <Button data-testid="back-btn" size='sm' className='gap-2'
                        onClick={goBack}
                    >
                        ← Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold">Submission Details</h2>
                        <span className={`
                            px-3 py-1 rounded-full text-sm font-medium
                            ${selectedSubmission.status === "Accepted" 
                                ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" 
                                : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                            }
                        `}>
                            {selectedSubmission.status}
                        </span>
                    </div>
                </div>

                {/* Submission Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Left Column - Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Basic Information</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Runtime</span>
                                <span className="font-mono font-medium">{selectedSubmission.runtime} ms</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Memory</span>
                                <span className="font-mono font-medium">{selectedSubmission.memory} KB</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Submitted</span>
                                <span className="font-mono text-sm">{TimeAgoFormat(selectedSubmission.submitted_on)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Additional Info */}
                    {(selectedSubmission.compile_output || selectedSubmission.message) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Additional Information</h3>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                {selectedSubmission.message && (
                                    <div>
                                        <span className="text-muted-foreground block text-sm mb-1">Message</span>
                                        <p className="font-mono text-sm bg-background p-2 rounded border">
                                            {selectedSubmission.message}
                                        </p>
                                    </div>
                                )}
                                {selectedSubmission.compile_output && (
                                    <div>
                                        <span className="text-muted-foreground block text-sm mb-1">Compile Output</span>
                                        <pre className="font-mono text-sm bg-background p-2 rounded border overflow-x-auto">
                                            {selectedSubmission.compile_output}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Output Section - Full Width */}
                {(selectedSubmission.stdout || selectedSubmission.stderr) && (
                    <div className="space-y-4 mt-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Program Output</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {selectedSubmission.stdout && (
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <span className="text-muted-foreground block text-sm mb-2">Standard Output</span>
                                    <pre className="font-mono text-sm bg-background p-3 rounded border overflow-x-auto max-h-64">
                                        {selectedSubmission.stdout}
                                    </pre>
                                </div>
                            )}
                            {selectedSubmission.stderr && (
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <span className="text-muted-foreground block text-sm mb-2">Standard Error</span>
                                    <pre className="font-mono text-sm bg-red-500/5 text-red-600 dark:text-red-400 p-3 rounded border border-red-200 dark:border-red-900 overflow-x-auto max-h-64">
                                        {selectedSubmission.stderr}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* No Output Message */}
                {!selectedSubmission.stdout && !selectedSubmission.stderr && !selectedSubmission.compile_output && !selectedSubmission.message && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <p className="text-lg">No additional output available</p>
                        <p className="text-sm mt-2">This submission didn't produce any stdout, stderr, or error messages</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SubmissionDetail