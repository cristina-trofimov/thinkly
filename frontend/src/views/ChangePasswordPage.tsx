import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { changePassword } from "../api/AuthAPI";
import { toast } from "sonner";

function ChangePasswordPage() {
  const navigate = useNavigate();
  
  // Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdatePassword = async () => {
    // 1. Basic Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    // 2. Matching Validation
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    // 3. Minimum Length Validation (consistent with backend constraint)
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });

      toast.success("Password updated successfully.");
      
      // Navigate back to profile after a brief delay
      setTimeout(() => {
        navigate(-1);
      }, 1000);

    } catch (err: any) {
      console.error("Change password error:", err);
      const errorMessage = err.response?.data?.detail || "Failed to update password. Check your current password.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-500">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-6 px-6 pb-6 pt-2 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-2 -ml-2 text-muted-foreground" 
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Change Password</h1>
            <p className="text-muted-foreground text-sm">Update your account security credentials.</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="rounded-3xl border-muted/20 shadow-md overflow-hidden">
          <CardContent className="p-8 space-y-8">
            
            {/* Current Password */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 opacity-70" /> Current Password
              </Label>
              <Input
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10 focus-visible:ring-[#8065CD] rounded-xl"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-6 pt-4 border-t border-muted/20">
              {/* New Password */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 opacity-70 text-[#8065CD]" /> New Password
                </Label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 focus-visible:ring-[#8065CD] rounded-xl"
                  disabled={isSubmitting}
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 opacity-70 text-[#8065CD]" /> Confirm New Password
                </Label>
                <Input
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`h-10 focus-visible:ring-[#8065CD] rounded-xl ${
                    confirmPassword && newPassword !== confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                  disabled={isSubmitting}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 font-medium ml-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-6">
              <Button
                onClick={handleUpdatePassword}
                className="w-full h-11 text-base font-semibold bg-[#8065CD] hover:bg-[#6d54b5] text-white rounded-xl transition-all shadow-lg shadow-[#8065CD]/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Security...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ChangePasswordPage;