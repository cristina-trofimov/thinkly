import * as React from "react"
import {
  Bot,
  LayoutDashboardIcon,
  Settings2,
  SquareTerminal,
  Trophy
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavSection } from "@/components/nav-section"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Sample data - can keep navMain and other even when backend is implemented, but remove user
const data = {
  user: {
    firstName: "shadcn",
    lastName: "example",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      name: "AlgoTime",
      url: "#",
      icon: SquareTerminal,
    },
    {
      name: "Competition",
      url: "#",
      icon: Bot,
    },
    {
      name: "Settings",
      url: "#",
      icon: Settings2,
    },
  ],
  navOther: [
    {
      name: "Leaderboard",
      url: "#",
      icon: Trophy,
    },
    {
      name: "Dashboard",
      url: "#",
      icon: LayoutDashboardIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-white text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Avatar>
                    <AvatarImage src="/assets/thinkly_logo.png" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <span className="font-medium">Thinkly</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavSection link={data.navMain} label="Platform"/>
        <NavSection link={data.navOther} label="Other"/>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
