import { Skeleton } from "@/components/ui/skeleton";

export default function CodingViewSkeleton() {
  return (
    <div
      data-testid="coding-view-skeleton"
      className="h-182.5 min-h-[calc(90vh)] w-full"
    >
      <div className="h-full w-full grid grid-cols-[1fr_1fr] gap-[3px]">
        <div className="rounded-md border overflow-hidden bg-card">
          <div className="h-10 px-4 bg-muted border-b border-border/75 flex items-center gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <div className="pt-3 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-18 w-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-18 w-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-rows-[65%_35%] gap-[3px]">
          <div className="rounded-md border overflow-hidden bg-card">
            <div className="h-10 px-4 bg-muted border-b border-border/75 flex items-center justify-between">
              <Skeleton className="h-6 w-16" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
            <div className="h-10 px-2 border-b border-border/75 flex items-center">
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-52 w-full" />
            </div>
          </div>

          <div className="rounded-md border overflow-hidden bg-card">
            <div className="h-10 px-4 bg-muted border-b border-border/75 flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
