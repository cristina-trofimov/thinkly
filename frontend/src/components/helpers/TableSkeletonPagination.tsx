import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TableSkeletonPagination() {
  return (
    <div className="flex flex-row items-center justify-between gap-3 py-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Button disabled variant="outline" size="sm" className="h-9 w-24 gap-1">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Button disabled variant="outline" size="sm" className="h-9 w-24 gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
