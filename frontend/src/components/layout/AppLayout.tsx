import { Outlet, useMatches } from 'react-router-dom'
import { SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppBreadcrumbs } from './AppBreadcrumb';
import { Separator } from '../ui/separator';

// Define the shape of route handle data
interface RouteHandle {
  crumb?: {
    title: string;
  };
}

function getSidebarCookie(): boolean {
  const match = /(?:^|; )sidebar_state=([^;]*)/.exec(document.cookie);
  // const match = document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
  return match ? match[1] === "true" : true;
}

export function Layout() {
  // Get all active routes
  const routes = useMatches();

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

  return (
    <SidebarProvider defaultOpen={getSidebarCookie()}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1 text-primary" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumbs items={breadcrumbItems} />
          </header>
          <div className="mt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}