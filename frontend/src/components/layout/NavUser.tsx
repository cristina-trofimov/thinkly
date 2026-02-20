import * as React from "react"
import {
  BadgeCheck,
  Bell,
  // ChevronsUpDown,
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
import { logout, getProfile } from "@/api/AuthAPI"
import { useNavigate } from "react-router-dom"
import { AvatarInitials } from "../helpers/AvatarInitials"
import type { Account } from "@/types/account/Account.type"
import { logFrontend } from '../../api/LoggerAPI';

interface NavUserProps {
  user?: Account | null;
}

export function NavUser({ user }: Readonly<NavUserProps>) {
  const navigate = useNavigate();
  const [localUser, setLocalUser] = React.useState<Account | null>(user ?? null)

  React.useEffect(() => {
    // If a user prop is not provided, fetch profile ourselves.
    if (user) return
    let mounted = true
    const fetch = async () => {
      try {
        const profile = await getProfile()
        if (mounted) setLocalUser(profile)
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `NavUser: failed to load profile: ${err instanceof Error ? err.message : String(err)}`,
          component: 'NavUser',
          url: globalThis.location.href,
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    }
    fetch()
    return () => { mounted = false }
  }, [user])

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
        url: globalThis.location.href,
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
      url: globalThis.location.href,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl hover:bg-muted/80 outline-none">
          <div className="hidden sm:grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium ml-2">{localUser?.firstName} {localUser?.lastName}</span>
          </div>
          <AvatarInitials className=""
            firstName={localUser?.firstName ?? ""}
            lastName={localUser?.lastName ?? ""}
            size="ml"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={"bottom"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <AvatarInitials
              firstName={localUser?.firstName ?? ""}
              lastName={localUser?.lastName ?? ""}
              size="md"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate text-xs">{localUser?.email}</span>
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
  )
}
