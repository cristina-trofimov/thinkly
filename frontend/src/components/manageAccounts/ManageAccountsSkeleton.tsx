import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ManageAccountsTableSkeleton() {
  const bodyRows = 8;

  return (
    <div aria-busy="true" aria-live="polite">
      <div className="overflow-hidden rounded-md border">
        {/* Column headers */}
        <div className="border-b px-4 py-3">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-1 flex justify-center">
              <Checkbox disabled />
            </div>
            <span className="col-span-3 text-sm font-medium">Name</span>
            <span className="col-span-4 text-sm font-medium">Email</span>
            <span className="col-span-2 text-sm font-medium text-right">Account Type</span>
            <span className="col-span-2 text-sm font-medium">Actions</span>
          </div>
        </div>

        {/* Data rows */}
        <div className="p-4 space-y-4">
          {Array.from({ length: bodyRows }, (_, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center">
              <Skeleton className="h-4 col-span-1" />
              <Skeleton className="h-4 col-span-3" />
              <Skeleton className="h-4 col-span-4" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-8 col-span-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination footer */}
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
    </div>
  );
}
