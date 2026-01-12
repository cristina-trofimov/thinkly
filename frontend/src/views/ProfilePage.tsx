import React from "react";
import { getProfile, isGoogleAccount } from "@/api/AuthAPI";
import { updateAccount } from "@/api/AccountsAPI";
import type { Account } from "@/types/account/Account.type";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { IdCardLanyard, Mail, User, IdCard, Pencil, KeyRound, Check, X } from "lucide-react";
import { AvatarInitials } from "@/components/helpers/AvatarInitials";
import { Button } from "@/components/ui/button";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import { logFrontend } from "@/api/LoggerAPI";

// Extending the local Account type to include the Google provider check
interface ProfileAccount extends Account {
    isGoogleUser?: boolean;
}

function ProfilePage() {
    const [user, setUser] = React.useState<ProfileAccount | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const navigate = useNavigate(); 
    const outlet = useOutlet();

    // State to track which field is currently being edited
    const [editingField, setEditingField] = React.useState<"firstName" | "lastName" | "email" | null>(null);
    // Temporary value state for the input field
    const [tempValue, setTempValue] = React.useState("");

    // Check for pending success messages after a page refresh
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
                    isGoogleAccount()
                ]);
                setUser({
                    id: currentAccount.id,
                    firstName: currentAccount.firstName,
                    lastName: currentAccount.lastName,
                    email: currentAccount.email,
                    accountType: currentAccount.accountType,
                    isGoogleUser: googleStatus.isGoogleUser
                });
            } catch (error) {
                logFrontend({
                    level: 'ERROR',
                    message: `Failed to load user profile: ${error}`,
                    component: 'ProfilePage',
                    url: window.location.href,
                });
                toast.error("Failed to load profile data.");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const startEditing = (field: "firstName" | "lastName" | "email", value: string) => {
        setEditingField(field);
        setTempValue(value);
    };

    const cancelEditing = () => {
        setEditingField(null);
        setTempValue("");
    };

    const saveField = async () => {
        if (!user || !editingField) return;

        setIsSaving(true);
        
        const fieldMapping: Record<string, string> = {
            firstName: "first_name",
            lastName: "last_name",
            email: "email"
        };

        const backendKey = fieldMapping[editingField];

        try {
            const updatedAccount = await updateAccount(user.id, {
                [backendKey]: tempValue
            });

            setUser(updatedAccount);
            
            const fieldLabel = editingField.charAt(0).toUpperCase() + 
                               editingField.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase();
            
            // Store the success message in session storage so it survives the reload
            sessionStorage.setItem("profileUpdateToast", `${fieldLabel} updated successfully.`);
            
            setEditingField(null);
            setTempValue("");
            
            // Full refresh to update navbar/sidebar names
            window.location.reload();
        } catch (error) {
            console.error(`Error updating ${editingField}:`, error);
            toast.error(`Failed to update ${editingField.toLowerCase()}.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePasswordNavigation = () => {
        navigate("changePassword");
    };

    if (outlet) {
        return outlet;
    }

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8065CD] border-t-transparent" />
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
                        <Badge className="bg-secondary text-primary capitalize rounded-full px-4 py-0.5">
                            {user?.accountType ?? "Participant"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <IdCardLanyard className="h-4 w-4" />
                        User ID: {user?.id}
                    </p>
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
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 opacity-70" /> First Name
                            </Label>
                            <div className="flex items-center justify-between group min-h-10">
                                {editingField === "firstName" ? (
                                    <div className="flex items-center gap-2 w-full animate-in slide-in-from-left-2 duration-200">
                                        <Input 
                                            value={tempValue} 
                                            onChange={(e) => setTempValue(e.target.value)}
                                            className="h-9 focus-visible:ring-[#8065CD]"
                                            disabled={isSaving}
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={saveField} disabled={isSaving} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={isSaving} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Label className="text-muted-foreground text-base font-normal">
                                            {user?.firstName ?? ""}
                                        </Label>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full transition-all"
                                            onClick={() => startEditing("firstName", user?.firstName ?? "")}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* Last Name Field */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 opacity-70" /> Last Name
                            </Label>
                            <div className="flex items-center justify-between group min-h-[40px]">
                                {editingField === "lastName" ? (
                                    <div className="flex items-center gap-2 w-full animate-in slide-in-from-left-2 duration-200">
                                        <Input 
                                            value={tempValue} 
                                            onChange={(e) => setTempValue(e.target.value)}
                                            className="h-9 focus-visible:ring-[#8065CD]"
                                            disabled={isSaving}
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={saveField} disabled={isSaving} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={isSaving} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Label className="text-muted-foreground text-base font-normal">
                                            {user?.lastName ?? ""}
                                        </Label>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full transition-all"
                                            onClick={() => startEditing("lastName", user?.lastName ?? "")}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* Email Field */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Mail className="h-4 w-4 opacity-70" /> Email
                            </Label>
                            <div className="flex items-center justify-between group min-h-[40px]">
                                {editingField === "email" ? (
                                    <div className="flex items-center gap-2 w-full animate-in slide-in-from-left-2 duration-200">
                                        <Input 
                                            value={tempValue} 
                                            onChange={(e) => setTempValue(e.target.value)}
                                            className="h-9 focus-visible:ring-[#8065CD]"
                                            disabled={isSaving}
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={saveField} disabled={isSaving} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={isSaving} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Label className="text-muted-foreground text-base font-normal">
                                            {user?.email ?? ""}
                                        </Label>
                                        {!user?.isGoogleUser ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full transition-all"
                                                onClick={() => startEditing("email", user?.email ?? "")}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">
                                                Managed by Google
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* Password Field */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <KeyRound className="h-4 w-4 opacity-70" /> Password
                            </Label>
                            <div className="flex items-center justify-between group">
                                <Label className="text-muted-foreground text-base font-normal tracking-widest">
                                    ••••••••••••
                                </Label>
                                {!user?.isGoogleUser ? (
                                    <Button
                                        variant="ghost"
                                        className="h-9 px-4 text-sm font-medium text-[#8065CD] hover:bg-[#8065CD]/10 rounded-xl transition-all"
                                        onClick={handleChangePasswordNavigation}
                                    >
                                        Change Password
                                    </Button>
                                ) : (
                                    <span className="text-[10px] uppercase font-bold text-[#8065CD]/60 tracking-wider">
                                        Managed by Google
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {user?.isGoogleUser && (
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                        <p className="text-xs text-blue-600/80 leading-relaxed text-center">
                            You signed in with Google. To change your password, please manage your settings through your 
                            <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="ml-1 underline font-semibold">
                                Google Account
                            </a>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfilePage;