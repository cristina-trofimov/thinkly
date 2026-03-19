import * as React from "react"
import {
  BadgeCheck,
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
import { logout } from "@/api/AuthAPI"
import { useNavigate } from "react-router-dom"
import { AvatarInitials } from "../helpers/AvatarInitials"
import { logFrontend } from '../../api/LoggerAPI';
import { useUser } from "@/context/UserContext"


export function NavUser() {
  const navigate = useNavigate();

  const { user } = useUser();
  // const [localUser, setLocalUser] = React.useState<Account | null>(user ?? null)

  // React.useEffect(() => {
  //   // If a user prop is not provided, fetch profile ourselves.
  //   if (user) return
  //   let mounted = true
  //   const fetch = async () => {
  //     try {
  //       const profile = await getProfile()
  //       if (mounted) setLocalUser(profile)
  //     } catch (err) {
  //       logFrontend({
  //         level: 'ERROR',
  //         message: `Error finding user profile: ${(err as Error).message}`,
  //         component: 'NavUser',
  //         url: globalThis.location.href,
  //         stack: (err as Error).stack,
  //       });
  //     }
  //   }
  //   fetch()
  //   return () => { mounted = false }
  // }, [user])

  const handleLogout = async () => {
    try {
      await logout();
      alert("You have been logged out.");
      navigate('/');
      localStorage.removeItem("theme");
      document.documentElement.classList.remove("dark");
    } catch (err) {
      logFrontend({
        level: 'ERROR',
        message: `Error logging out: ${(err as Error).message}`,
        component: 'NavUser',
        url: globalThis.location.href,
        stack: (err as Error).stack,
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
        <button className="cursor-pointer flex items-center gap-2 rounded-xl hover:bg-muted/80 outline-none">
          <div className="hidden sm:grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium ml-2">{user?.firstName} {user?.lastName}</span>
          </div>
          <AvatarInitials className=""
            firstName={user?.firstName ?? ""}
            lastName={user?.lastName ?? ""}
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
              firstName={user?.firstName ?? ""}
              lastName={user?.lastName ?? ""}
              size="md"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
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
