import { Skeleton } from '../ui/skeleton'

// ─── Skeleton that mirrors the result card layout ────────────────────────────

export const SubmissionSkeleton = () => (
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