import { Outlet, useMatches } from 'react-router-dom'
import { SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppBreadcrumbs } from './AppBreadcrumb';
import { NavUser } from './NavUser'
import { MobileBanner } from "./MobileBanner";
import { useUser } from '@/context/UserContext';
// Add to imports
import { Skeleton } from "@/components/ui/skeleton";

// Define the shape of route handle data
interface RouteHandle {
  crumb?: {
    title: string;
  };
}

function getSidebarCookie(): boolean {
  const match = /(?:^|; )sidebar_state=([^;]*)/.exec(document.cookie)
  return match ? match[1] === "true" : true
}

export function Layout() {
  // Get all active routes
  const routes = useMatches();
  const { loading } = useUser();

  // Build breadcrumb items from routes
  const breadcrumbItems = routes
    .filter((match) => {
      // Only include routes that have a crumb defined in their handle
      return (match.handle as RouteHandle)?.crumb;
    })
    .map((match) => ({
      title: (match.handle as RouteHandle).crumb!.title,
      href: match.pathname,
    }));

  if (loading) {
    return (
      <div className="flex min-h-screen w-full">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r flex flex-col gap-4 p-4 shrink-0">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex flex-col gap-2 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
          <div className="mt-auto">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-48" />
            <div className="ml-auto">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>

          {/* Page content */}
          <div className="p-6 flex flex-col gap-4">

          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={getSidebarCookie()}>
      <MobileBanner />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex pt-2 pb-2 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
            <SidebarTrigger className="-ml-1 text-primary hover:text-primary hover:bg-accent/50" />
            <AppBreadcrumbs items={breadcrumbItems} />
            <div className="ml-auto flex items-center">
              <NavUser />
            </div>
          </header>
          <div className="mt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
