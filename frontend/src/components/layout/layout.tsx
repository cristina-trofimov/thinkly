import { Outlet, useMatches } from 'react-router-dom'
import { SidebarProvider } from '../ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { AppBreadcrumbs } from './app-breadcrumb';

// Define the shape of route handle data
interface RouteHandle {
  crumb?: {
    title: string;
  };
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
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 p-4">
          <AppBreadcrumbs items={breadcrumbItems} />
          <div className="mt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}