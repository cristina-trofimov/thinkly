import { Skeleton } from '../ui/skeleton'

// ─── Skeleton that mirrors the result card layout ────────────────────────────

export const SubmissionSkeleton = () => (
    <div data-testid="submission-result-skeleton" className="space-y-6 animate-in fade-in duration-300">
        {/* Header row – status badge + title */}
        <div className="flex items-center gap-4 pb-4 border-b">
            <Skeleton className="h-8 w-24 rounded-full" />
            <h2 className="text-xl font-semibold">Submission Result</h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Basic Information
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Runtime</span>
                        <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Memory</span>
                        <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Submitted</span>
                        <Skeleton className="h-4 w-28 rounded" />
                    </div>
                </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Additional Information
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                </div>
            </div>
        </div>

        {/* Output section */}
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Program Output
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <span className="text-muted-foreground block text-sm">Standard Output</span>
                    <Skeleton className="h-24 w-full rounded" />
                </div>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <span className="text-muted-foreground block text-sm">Standard Error</span>
                    <Skeleton className="h-24 w-full rounded" />
                </div>
            </div>
        </div>
    </div>
)