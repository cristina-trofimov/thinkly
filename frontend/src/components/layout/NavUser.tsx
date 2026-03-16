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
import { logout, getProfile } from "@/api/AuthAPI"
import { useNavigate } from "react-router-dom"
import { AvatarInitials } from "../helpers/AvatarInitials"
import type { Account } from "@/types/account/Account.type"
import { logFrontend } from '../../api/LoggerAPI';
import { getUserPreferences, updateUserPreferences } from "@/api/AccountsAPI";

interface NavUserProps {
  user?: Account | null;
}

export function NavUser({ user }: Readonly<NavUserProps>) {
  const navigate = useNavigate();
  const [localUser, setLocalUser] = React.useState<Account | null>(user ?? null)

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

    window.addEventListener("storage", syncTheme);
    window.addEventListener("storage_sync", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("storage_sync", syncTheme);
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
    window.dispatchEvent(new Event("storage_sync"));

    if (localUser?.id) {
      try {
        await updateUserPreferences(localUser.id, {
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

  React.useEffect(() => {
    if (user) return
    let mounted = true

    const fetch = async () => {
      try {
      const profile = await getProfile();
      if (!mounted) return;
      
      setLocalUser(profile);

      // Fetch preferences from DB and sync them to the UI/Storage
      const prefs = await getUserPreferences(profile.id);
      if (prefs.theme) {
        setTheme(prefs.theme);
        localStorage.setItem("theme", prefs.theme);
        if (prefs.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
          
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `Error finding user profile: ${(err as Error).message}`,
          component: 'NavUser',
          url: globalThis.location.href,
        });
      }
    }
    fetch()
    return () => { mounted = false }
  }, [user])

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
            <span className="truncate font-medium ml-2">{localUser?.firstName} {localUser?.lastName}</span>
          </div>
          <AvatarInitials
            firstName={localUser?.firstName ?? ""}
            lastName={localUser?.lastName ?? ""}
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
              firstName={localUser?.firstName ?? ""}
              lastName={localUser?.lastName ?? ""}
              size="md"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{localUser?.firstName}</span>
              <span className="truncate text-xs text-muted-foreground">{localUser?.email}</span>
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