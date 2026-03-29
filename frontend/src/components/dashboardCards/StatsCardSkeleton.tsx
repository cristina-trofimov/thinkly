import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardSkeletonProps {
  title: string;
}

export function StatsCardSkeleton({ title }: Readonly<StatsCardSkeletonProps>) {
  return (
    <Card>
      <CardHeader className="pb-5">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium text-muted-foreground text-center">
            {title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="text-left">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-12 w-24" />
        </div>
        <div className="flex items-center gap-1 mb-2">
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}
