import { Skeleton } from "@/components/ui/skeleton";

export function PieChartSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex h-[180px] items-center justify-center">
      <div className="relative flex h-45 w-45 items-center justify-center">
        <Skeleton className="h-45 w-45 rounded-full" />
        <div className="absolute flex h-25 w-25 items-center justify-center rounded-full bg-card">
        </div>
      </div>
    </div>
  );
}

export function VerticalBarsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex h-[180px] items-end gap-4 px-4 pt-4">
      {["h-20", "h-28", "h-16", "h-32", "h-24", "h-14", "h-26"].map((height, index) => (
        <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
          <Skeleton className={`w-full rounded-md ${height}`} />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

export function HorizontalBarsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="relative h-[180px] px-4 py-3">
      <div className="absolute bottom-6 left-18 right-4 h-px bg-border" />
      <div className="absolute bottom-6 left-18 top-4 w-px bg-border" />
      <div className="flex h-full flex-col justify-center gap-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className={`h-6 rounded-md ${index === 0 ? "w-2/5" : index === 1 ? "w-3/5" : "w-4/5"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChartSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="relative h-[180px] px-4 py-3">
      <div className="absolute bottom-8 left-6 right-4 h-px bg-border" />
      <div className="absolute bottom-8 left-6 top-4 w-px bg-border" />
      <div className="absolute left-6 right-3 top-4 bottom-8">
        <div className="relative h-full rounded-md border border-dashed border-border/60 bg-muted/20">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 72
                 C 10 72, 10 58, 20 58
                 C 30 58, 30 66, 40 66
                 C 50 66, 50 44, 60 44
                 C 70 44, 70 52, 80 52
                 C 90 52, 92 34, 100 34"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-1 left-6 right-4 flex items-end justify-between gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
