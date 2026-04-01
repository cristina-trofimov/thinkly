import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const SKELETON_CARD_COUNT = 8;

export default function AlgoTimePageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-4/3 relative overflow-hidden p-6 bg-linear-to-br from-primary/10 via-primary/5 to-background">
            <div className="absolute inset-0 bg-grid-primary/5" />

            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="flex w-full max-w-[13rem] flex-col items-center gap-3">

              </div>
            </div>
          </div>

          <div className="p-4 pb-0 flex flex-col gap-2">
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-4 w-36" />
            </div>

            <div className="flex items-center justify-end pt-2 border-t pb-4">
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
