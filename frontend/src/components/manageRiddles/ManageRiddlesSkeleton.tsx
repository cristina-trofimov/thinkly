import { Skeleton } from "@/components/ui/skeleton";

type ManageRiddlesSkeletonProps = {
  count?: number;
};

export default function ManageRiddlesSkeleton({
  count = 7,
}: ManageRiddlesSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border bg-card flex flex-col h-full"
          aria-hidden="true"
        >
          <div className="bg-muted/30 p-6 pb-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[92%]" />
                <Skeleton className="h-4 w-[68%]" />
              </div>
            </div>

            <div className="mt-auto pt-4 border-t">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            <div className="pt-2">
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
