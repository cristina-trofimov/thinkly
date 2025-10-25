import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Layout() {
  return (
    <SidebarProvider>
      
      <AppSidebar />

      <SidebarInset>
        <header>
          <div className="flex items-center gap-2 px-0">
            <SidebarTrigger/>
            <Separator orientation="vertical" className="mr-2 h-4"/>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
      </SidebarInset>

    </SidebarProvider>
  )
}
