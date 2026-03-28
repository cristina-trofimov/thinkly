import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_WIDTHS = ["w-16", "w-24", "w-28", "w-28", "w-24"];

export function EventLeaderboardSkeleton() {
  return (
    <div data-testid="event-leaderboard-skeleton" className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="border-b bg-muted/40 px-4 py-3">
          <div className="grid grid-cols-5 gap-4">
            {COLUMN_WIDTHS.map((width, index) => (
              <Skeleton key={`leaderboard-header-${index}`} className={`h-4 ${width}`} />
            ))}
          </div>
        </div>

        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={`leaderboard-row-${rowIndex}`} className="px-4 py-4">
              <div className="grid grid-cols-5 items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
