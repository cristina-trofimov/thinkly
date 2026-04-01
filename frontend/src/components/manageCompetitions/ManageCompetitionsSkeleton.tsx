import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type ManageCompetitionsSkeletonProps = {
  readonly isOwner?: boolean;
};

export default function ManageCompetitionsSkeleton({ isOwner = false }: ManageCompetitionsSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-4/3 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              {isOwner && (
                <div className="pt-2 border-t flex justify-end">
                  <Button disabled variant="ghost" size="sm" className="h-8 text-destructive">
                    Delete <Trash2 className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
