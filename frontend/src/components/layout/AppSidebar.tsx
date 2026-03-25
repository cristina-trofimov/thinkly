import * as React from "react"
import {
  Bot,
  LayoutDashboardIcon,
  SquareTerminal,
  Trophy
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavSection } from "@/components/layout/NavSection"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useUser } from "@/context/UserContext"

// Static data definitions
const navMain = [
  {
    name: "AlgoTime",
    url: "/app/algotime",
    icon: SquareTerminal,
  },
  {
    name: "Competitions",
    url: "/app/competitions",
    icon: Bot,
  },
];

const navOther = [
  {
    name: "Leaderboards",
    url: "/app/leaderboards",
    icon: Trophy,
  },
  {
    name: "Dashboard",
    url: "/app/dashboard",
    icon: LayoutDashboardIcon,
    // Add a permission flag here if you want to be generic,
    // or we can hardcode the check in the component
    requiresAdmin: true
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();

  // 🔒 Filter logic:
  // We recreate the 'navOther' list based on the user's role.
  const filteredOtherLinks = React.useMemo(() => {
    if (!user) return []; // Or return just public links if you prefer

    const isAdminOrOwner = ['admin', 'owner'].includes(user?.accountType?.toLowerCase() ?? "");

    return navOther.filter(item => {
      // If the item requires admin and the user is NOT one, hide it.
      if (item.requiresAdmin && !isAdminOrOwner) {
        return false;
      }
      return true;
    });
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/app/home">
                <div className="bg-card text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
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
        {/* navMain is static for everyone */}
        <NavSection link={navMain} label="Platform" />

        {/* 🔒 Use the filtered list here */}
        <NavSection link={filteredOtherLinks} label="Other" />
      </SidebarContent>

      {/* Footer intentionally left empty; user nav moved to top header */}
    </Sidebar>
  )
}