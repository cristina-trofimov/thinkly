import * as React from "react"
import {
  Bot,
  LayoutDashboardIcon,
  Settings2,
  SquareTerminal,
  Trophy
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavSection } from "@/components/layout/NavSection"
import { NavUser } from "@/components/layout/NavUser"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getProfile } from "@/api/AuthAPI"
import type { Account } from "@/types/account/Account.type"

// Static data definitions
const navMain = [
  {
    name: "AlgoTime",
    url: "/app/algotime",
    icon: SquareTerminal,
  },
  {
    name: "Competition",
    url: "/app/competition",
    icon: Bot,
  },
  {
    name: "Settings",
    url: "/app/settings",
    icon: Settings2,
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
  const [user, setUser] = React.useState<Account | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentAccount = await getProfile();
        console.log("Fetched user profile:", currentAccount);
        setUser({
          id: currentAccount.id,
          firstName: currentAccount.firstName,
          lastName: currentAccount.lastName,
          email: currentAccount.email,
          accountType: currentAccount.accountType,
        });
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    fetchUser();
  }, []);

  // 🔒 Filter logic:
  // We recreate the 'navOther' list based on the user's role.
  const filteredOtherLinks = React.useMemo(() => {
    if (!user) return []; // Or return just public links if you prefer

    const isAdminOrOwner = ['admin', 'owner'].includes(user.accountType);

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
            <div className="flex items-center gap-2 w-full">
              <SidebarMenuButton size="lg" asChild>
                <a href="/app/home">
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
              <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:hidden" style={{ color: '#8065CD' }} />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* navMain is static for everyone */}
        <NavSection link={navMain} label="Platform" />

        {/* 🔒 Use the filtered list here */}
        <NavSection link={filteredOtherLinks} label="Other" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}