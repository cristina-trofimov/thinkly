import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { TableSkeletonPagination } from "@/components/helpers/TableSkeletonPagination";

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

      <TableSkeletonPagination />
    </div>
  );
}
