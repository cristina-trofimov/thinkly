import * as React from "react"
import {
  BadgeCheck,
  LogOut,
  Moon,
  Sun,
  Palette,
  Check,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/api/AuthAPI"
import { useNavigate } from "react-router-dom"
import { AvatarInitials } from "../helpers/AvatarInitials"
import { logFrontend } from '../../api/LoggerAPI';
import { useUser } from "@/context/UserContext"
import { getUserPreferences, updateUserPreferences } from "@/api/AccountsAPI";


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
  // Initialize theme state from localStorage
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") ?? "light";
  });

  React.useEffect(() => {
    const syncTheme = () => {
      const current = (localStorage.getItem("theme") as "light" | "dark") ?? "light";
      setTheme(current);
      // Ensure the DOM actually matches what was just set in localStorage
      if (current === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    globalThis.addEventListener("storage", syncTheme);
    globalThis.addEventListener("storage_sync", syncTheme);

    return () => {
      globalThis.removeEventListener("storage", syncTheme);
      globalThis.removeEventListener("storage_sync", syncTheme);
    };
  }, []);

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Tell other components (like ProfilePage) to update their buttons
    globalThis.dispatchEvent(new Event("storage_sync"));

    if (user?.id) {
      try {
        await updateUserPreferences(user.id, {
          theme: newTheme,
          notifications_enabled: true,
        });
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `Failed to auto-save theme preference: ${(err as Error).message}`,
          component: 'NavUser',
          url: globalThis.location.href,
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      localStorage.removeItem("theme");
      document.documentElement.classList.remove("dark");
    } catch (err) {
      logFrontend({
        level: 'ERROR',
        message: `Error logging out: ${(err as Error).message}`,
        component: 'NavUser',
        url: globalThis.location.href,
      });
    }
  };

  const handleProfileClick = () => {
    navigate('/app/profile');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer flex items-center gap-2 rounded-xl hover:bg-muted/80 outline-none p-1">
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
        className="w-56 rounded-lg"
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
              <span className="truncate font-semibold">{user?.firstName}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick}>
            <BadgeCheck className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                  {theme === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                  {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NavUser;