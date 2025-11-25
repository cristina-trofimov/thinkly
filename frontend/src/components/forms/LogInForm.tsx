import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { googleLogin, login } from "@/api/auth";
import type { LoginRequest, DecodedToken } from "@/types/Auth";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">): React.ReactElement {
    const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ): void => {
        setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { token } = await login(form);
            localStorage.setItem("token", token);

            console.log(localStorage.getItem("token"));

            const decoded = jwtDecode<DecodedToken>(token);
            console.log("Logged in as:", decoded.sub);

            // Optionally redirect based on role
            //            const role = decoded.sub.role;    throwing lint error: unused
            if (decoded) {
                navigate('/app/home');
            }


        } catch (err) {
            console.error(err);
            setError("Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    interface GoogleCredentialResponse {
        credential?: string;
        select_by?: string;
    }
    const handleGoogleSuccess = async (
        credentialResponse: GoogleCredentialResponse
    ): Promise<void> => {
        try {
            const { credential } = credentialResponse;
            if (!credential) {
                throw new Error("No credential returned by Google");
            }

            const res = await googleLogin(credential);
            const { token } = res;
            localStorage.setItem("token", token);

            const decoded = jwtDecode<DecodedToken>(token);
            if (decoded) {
                navigate('/app/home');
            }
        } catch (err: unknown) {
            console.error("Google login failed:", err);
            if (err instanceof Error) {
                alert(`Google login failed: ${err.message}`);
            } else {
                alert("Google login failed");
            }
        }
    };

    /*    const handleGetProfile = async () => {
            try {
                const data = await getProfile();
                console.log("Profile:", data);
                setProfile(data);
                alert(`Email: ${data.email}\nRole: ${data.role}`);
            } catch (err: any) {
                console.error("Error fetching profile:", err);
                alert(err.response?.data?.error || err.message);
            }
        }; Throwing lint error: unused*/

    const handleGoogleError = (): void => {
        alert("Google Sign-In was unsuccessful. Try again later.");
    };
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="me@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    required
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    required
                                />
                            </Field>
                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                            <Field className="flex flex-col gap-2 mt-4">
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Logging in..." : "Sign In"}
                                </Button>
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                />

                                <FieldDescription className="text-center">
                                    Don&apos;t have an account?{' '}
                                    <button
                                        type="button"
                                        className="text-gray-500 underline cursor-pointer"
                                        onClick={() => navigate('/signup')}
                                    >
                                        Sign up
                                    </button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
