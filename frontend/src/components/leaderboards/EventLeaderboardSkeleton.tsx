import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_SKELETONS = [
  { id: "rank", width: "w-16" },
  { id: "name", width: "w-24" },
  { id: "points", width: "w-28" },
  { id: "solved", width: "w-28" },
  { id: "time", width: "w-24" },
] as const;

const ROW_SKELETON_IDS = [
  "leader",
  "challenger",
  "contender",
  "solver",
  "sprinter",
  "climber",
] as const;

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
            {COLUMN_SKELETONS.map((column) => (
              <Skeleton key={column.id} className={`h-4 ${column.width}`} />
            ))}
          </div>
        </div>

        <div className="divide-y">
          {ROW_SKELETON_IDS.map((rowId) => (
            <div key={rowId} className="px-4 py-4">
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
