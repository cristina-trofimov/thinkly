import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { logout } from "@/api/AuthAPI"
import { useNavigate } from "react-router-dom"
import { AvatarInitials } from "../helpers/AvatarInitials"
import type { Account } from "@/types/account/Account.type"
import { logFrontend } from '../../api/LoggerAPI'; 

interface NavUserProps {
  user: Account | null;
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      alert("You have been logged out.");
      navigate('/');
    } catch (err: unknown) {
      logFrontend({
        level: 'ERROR', 
        message: `Logout failed: ${err instanceof Error ? err.message : String(err)}`,
        component: 'NavUser',
        url: window.location.href,
    });

      // Narrow the type
      if (err instanceof Error) {
        alert(err.message);
      } else if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        alert(axiosError.response?.data?.error || "An unknown error occurred during logout");
      } else {
        alert(String(err));
      }
    }
  };

  const handleProfileClick = () => {
    navigate('/app/profile');
    logFrontend({
        level: 'INFO', 
        message: `Navigated to the user profile page.`,
        component: 'NavUser',
        url: window.location.href,
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <AvatarInitials
                firstName={user?.firstName ?? ""}
                lastName={user?.lastName ?? ""}
                size="md"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.firstName} {user?.lastName}</span>
                <span className="truncate text-xs">{user?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <AvatarInitials
                  firstName={user?.firstName ?? ""}
                  lastName={user?.lastName ?? ""}
                  size="md"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.firstName} {user?.lastName}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleProfileClick}>
                <BadgeCheck />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
