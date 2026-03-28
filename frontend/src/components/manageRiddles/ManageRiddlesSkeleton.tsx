import { Skeleton } from "@/components/ui/skeleton";

export default function ManageRiddlesSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border bg-card">
            <div className="bg-muted/30 p-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
              </div>
              <div className="space-y-2 border-t pt-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-2/3" />
              </div>
              <div className="pt-2">
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
