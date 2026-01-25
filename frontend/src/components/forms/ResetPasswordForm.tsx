import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosClient from "@/lib/axiosClient";

export default function ResetPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const tokenFromUrl = searchParams.get("token");
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError("Invalid or missing reset token. Please request a new password reset link.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!token) {
            setError("Invalid reset token.");
            return;
        }

        setLoading(true);

        try {
            const response = await axiosClient.post("/auth/reset-password", {
                token,
                new_password: newPassword,
            });

            setSuccess(response.data.message || "Password reset successfully!");

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate("/");
            }, 2000);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error(err);
            setError(
                err.response?.data?.detail ||
                "Failed to reset password. The link may have expired."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col items-center justify-center min-h-[80vh] gap-6", className)} {...props}>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Reset Your Password</CardTitle>
                    <CardDescription>
                        Enter your new password below. Make sure it's at least 8 characters long.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!token && !loading ? (
                        <div className="text-center">
                            <p className="text-sm text-red-500 mb-4">{error}</p>
                            <Button onClick={() => navigate("/forgot-password")}>
                                Request New Reset Link
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                        minLength={8}
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                        minLength={8}
                                    />
                                </Field>

                                {error && <p className="text-sm text-red-500">{error}</p>}
                                {success && (
                                    <div className="text-sm text-green-500">
                                        <p>{success}</p>
                                        <p className="mt-1">Redirecting to login...</p>
                                    </div>
                                )}

                                <Field className="flex flex-col gap-2 mt-4">
                                    <Button type="submit" disabled={loading || success !== null}>
                                        {loading ? "Resetting..." : "Reset Password"}
                                    </Button>

                                    <FieldDescription className="text-center">
                                        Remember your password?{" "}
                                        <button
                                            type="button"
                                            className="text-gray-500 underline cursor-pointer"
                                            onClick={() => navigate("/")}
                                        >
                                            Go to Login
                                        </button>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}