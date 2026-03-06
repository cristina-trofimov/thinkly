import React from "react";
import { getProfile, isGoogleAccount } from "@/api/AuthAPI";
import { updateAccount, getUserPreferences, updateUserPreferences } from "@/api/AccountsAPI";
import type { UserPreferences } from "@/api/AccountsAPI";
import type { Account } from "@/types/account/Account.type";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  User,
  IdCard,
  Pencil,
  KeyRound,
  Check,
  X,
  Bell,
  Sun,
  Moon,
  Settings2,
} from "lucide-react";
import { AvatarInitials } from "@/components/helpers/AvatarInitials";
import { Button } from "@/components/ui/button";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import { logFrontend } from "@/api/LoggerAPI";
import { useAnalytics } from "@/hooks/useAnalytics";

// Extending the local Account type to include the Google provider check
interface ProfileAccount extends Account {
  isGoogleUser?: boolean;
}

// Type alias for editable fields
type EditableFieldName = "firstName" | "lastName" | "email";

// Reusable editable field component
interface EditableFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  fieldName: EditableFieldName;
  isEditing: boolean;
  tempValue: string;
  isSaving: boolean;
  isDisabled?: boolean;
  disabledMessage?: string;
  onStartEdit: (fieldName: EditableFieldName, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onTempValueChange: (value: string) => void;
}

const EditableField: React.FC<EditableFieldProps> = ({
  icon,
  label,
  value,
  fieldName,
  isEditing,
  tempValue,
  isSaving,
  isDisabled,
  disabledMessage,
  onStartEdit,
  onSave,
  onCancel,
  onTempValueChange,
}) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        {icon} {label}
      </Label>
      <div className="flex items-center justify-between group min-h-10">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full animate-in slide-in-from-left-2 duration-200">
            <Input
              value={tempValue}
              onChange={(e) => onTempValueChange(e.target.value)}
              className="h-9"
              disabled={isSaving}
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={onSave}
              disabled={isSaving}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Label className="text-muted-foreground text-base font-normal">
              {value}
            </Label>
            {isDisabled ? (
              <span className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">
                {disabledMessage}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:bg-primary/10 transition-all"
                onClick={() => onStartEdit(fieldName, value)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function ProfilePage() {
  const [user, setUser] = React.useState<ProfileAccount | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [preferences, setPreferences] = React.useState<UserPreferences>({
    theme: "light",
    notifications_enabled: true,
  });
  const [savedPreferences, setSavedPreferences] = React.useState<UserPreferences>({
    theme: "light",
    notifications_enabled: true,
  });
  const [isSavingPrefs, setIsSavingPrefs] = React.useState(false);
  const navigate = useNavigate();
  const outlet = useOutlet();
  const {
    trackProfileViewed,
    trackProfileFieldEdited,
    trackProfileFieldSaved,
    trackProfileFieldSaveFailed,
    trackChangePasswordNavigated,
  } = useAnalytics();

  const [editingField, setEditingField] = React.useState<EditableFieldName | null>(
    null
  );
  const [tempValue, setTempValue] = React.useState("");

  // Track profile view once on mount
  React.useEffect(() => {
    trackProfileViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const pendingToast = sessionStorage.getItem("profileUpdateToast");
    if (pendingToast) {
      toast.success(pendingToast);
      sessionStorage.removeItem("profileUpdateToast");
    }
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const [currentAccount, googleStatus] = await Promise.all([
          getProfile(),
          isGoogleAccount(),
        ]);
        setUser({
          id: currentAccount.id,
          firstName: currentAccount.firstName,
          lastName: currentAccount.lastName,
          email: currentAccount.email,
          accountType: currentAccount.accountType,
          isGoogleUser: googleStatus.isGoogleUser,
        });

        // Fetch preferences after we have the user id
        try {
          const prefs = await getUserPreferences(currentAccount.id);
          setPreferences(prefs);
          setSavedPreferences(prefs);
        } catch {
          logFrontend({
            level: "ERROR",
            message: `Failed fetch preferences`,
            component: "ProfilePage.ts",
            url: globalThis.location.href,
          });
        }
      } catch (error) {
        logFrontend({
          level: "ERROR",
          message: `Failed to load user profile: ${error}`,
          component: "ProfilePage",
          url: globalThis.location.href,
        });
        toast.error("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [preferences.theme]);

  const startEditing = (
    field: EditableFieldName,
    value: string
  ) => {
    setEditingField(field);
    setTempValue(value);
    trackProfileFieldEdited(field);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue("");
  };

  const preferencesChanged =
    preferences.theme !== savedPreferences.theme ||
    preferences.notifications_enabled !== savedPreferences.notifications_enabled;

  const savePreferences = async () => {
    if (!user) return;
    setIsSavingPrefs(true);
    try {
      const updated = await updateUserPreferences(user.id, preferences);
      setPreferences(updated);
      setSavedPreferences(updated);
      toast.success("Preferences saved.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const saveField = async () => {
    if (!user || !editingField) return;

    setIsSaving(true);

    const fieldMapping: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
    };

    const backendKey = fieldMapping[editingField];

    try {
      const updatedAccount = await updateAccount(user.id, {
        [backendKey]: tempValue,
      });

      trackProfileFieldSaved(editingField);
      setUser(updatedAccount);

      const fieldLabel =
        editingField.charAt(0).toUpperCase() +
        editingField.slice(1).replaceAll(/([A-Z])/g, " $1").toLowerCase();

      sessionStorage.setItem(
        "profileUpdateToast",
        `${fieldLabel} updated successfully.`
      );

      setEditingField(null);
      setTempValue("");

      globalThis.location.reload();
    } catch (error) {
      console.error(`Error updating ${editingField}:`, error);
      trackProfileFieldSaveFailed(
        editingField,
        error instanceof Error ? error.message : "Unknown error"
      );
      toast.error(`Failed to update ${editingField.toLowerCase()}.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordNavigation = () => {
    trackChangePasswordNavigated();
    navigate("changePassword");
  };

  if (outlet) {
    return outlet;
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-6 md:p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center md:items-center gap-8">
        <div className="relative group">
          <div className="size-35 rounded-full border-4 border-white overflow-hidden ring-2 ring-primary/20 flex items-center justify-center">
            <AvatarInitials
              firstName={user?.firstName ?? ""}
              lastName={user?.lastName ?? ""}
              size="xl"
            />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              {user?.firstName} {user?.lastName}
            </h1>
            <Badge className="bg-white text-primary capitalize rounded-full px-4 py-0.5">
              {user?.accountType ?? "Participant"}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <IdCard className="h-5 w-5 text-primary" />
            Personal Information
          </h2>
        </div>

        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            {/* First Name Field */}
            <EditableField
              icon={<User className="h-4 w-4 opacity-70 text-primary" />}
              label="First Name"
              value={user?.firstName ?? ""}
              fieldName="firstName"
              isEditing={editingField === "firstName"}
              tempValue={tempValue}
              isSaving={isSaving}
              onStartEdit={startEditing}
              onSave={saveField}
              onCancel={cancelEditing}
              onTempValueChange={setTempValue}
            />

            <Separator className="opacity-60" />

            {/* Last Name Field */}
            <EditableField
              icon={<User className="h-4 w-4 opacity-70 text-primary" />}
              label="Last Name"
              value={user?.lastName ?? ""}
              fieldName="lastName"
              isEditing={editingField === "lastName"}
              tempValue={tempValue}
              isSaving={isSaving}
              onStartEdit={startEditing}
              onSave={saveField}
              onCancel={cancelEditing}
              onTempValueChange={setTempValue}
            />

            <Separator className="opacity-60" />

            {/* Email Field */}
            <EditableField
              icon={<Mail className="h-4 w-4 opacity-70 text-primary" />}
              label="Email"
              value={user?.email ?? ""}
              fieldName="email"
              isEditing={editingField === "email"}
              tempValue={tempValue}
              isSaving={isSaving}
              isDisabled={user?.isGoogleUser}
              disabledMessage="Managed by Google"
              onStartEdit={startEditing}
              onSave={saveField}
              onCancel={cancelEditing}
              onTempValueChange={setTempValue}
            />

            <Separator className="opacity-50" />

            {/* Password Field */}
            <div className="pt-2">
              {user?.isGoogleUser ? (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <KeyRound className="h-4 w-4 opacity-70 text-primary" /> Password
                  </Label>
                  <div className="flex items-center justify-between group min-h-10">
                    <Label className="text-muted-foreground text-base font-normal tracking-widest">
                      ••••••••••••
                    </Label>
                    <span className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">
                      Managed by Google
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    className="h-9 px-4 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={handleChangePasswordNavigation}
                  >
                    Change Password
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {user?.isGoogleUser && (
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
            <p className="text-xs text-blue-600/80 leading-relaxed text-center">
              You signed in with Google. To change your password, please manage
              your settings through your{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Google Account
              </a>
              {" "}.
            </p>
          </div>
        )}

        {/* Preferences Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Preferences
          </h2>
        </div>

        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            {/* Theme */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                {preferences.theme === "dark"
                  ? <Moon className="h-4 w-4 opacity-70 text-primary" />
                  : <Sun className="h-4 w-4 opacity-70 text-primary" />}
                Theme
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreferences((p) => ({ ...p, theme: "light" }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${preferences.theme === "light"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                >
                  <Sun className="h-4 w-4" /> Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreferences((p) => ({ ...p, theme: "dark" }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${preferences.theme === "dark"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                >
                  <Moon className="h-4 w-4" /> Dark
                </button>
              </div>
            </div>

            <Separator className="opacity-60" />

            {/* Notifications */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 opacity-70 text-primary" /> Notifications
              </Label>
              <div className="flex items-center justify-between min-h-10">
                <Label className="text-muted-foreground text-base font-normal">
                  Enable email notifications
                </Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.notifications_enabled}
                  onClick={() =>
                    setPreferences((p) => ({
                      ...p,
                      notifications_enabled: !p.notifications_enabled,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${preferences.notifications_enabled ? "bg-primary" : "bg-input"
                    }`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${preferences.notifications_enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={savePreferences}
                disabled={!preferencesChanged || isSavingPrefs}
                className="h-9 px-6 text-sm font-medium disabled:opacity-40"
              >
                {isSavingPrefs ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{' '}
                    Saving…
                  </span>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProfilePage;