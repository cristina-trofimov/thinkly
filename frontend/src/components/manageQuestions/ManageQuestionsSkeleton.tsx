import { Skeleton } from "@/components/ui/skeleton";

export default function ManageQuestionsTableSkeleton() {
  const bodyRows = 8;

  return (
    <div aria-busy="true" aria-live="polite">
      <div className="overflow-hidden rounded-md border">
        <div className="border-b px-4 py-3">
          <div className="grid grid-cols-12 gap-4">
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-4" />
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {Array.from({ length: bodyRows }, (_, index) => (
            <div key={index} className="grid grid-cols-12 items-center gap-4">
              <Skeleton className="h-4 col-span-1" />
              <Skeleton className="h-4 col-span-1" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-4" />
              <Skeleton className="h-6 col-span-2 rounded-full" />
              <Skeleton className="h-4 col-span-1" />
              <Skeleton className="h-8 col-span-1" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}
