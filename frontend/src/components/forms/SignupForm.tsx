import { login, signup } from "@/api/auth";
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { DecodedToken } from "@/types/Auth";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirm_password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        try {
            setLoading(true);
            await signup({
                email: formData.email,
                password: formData.password,
                firstName: formData.first_name,
                lastName: formData.last_name,
                username: formData.email.split("@")[0],
            });

            alert("Account created successfully!");

            try {
                const { token } = await login({ email: formData.email, password: formData.password });
                if (!token) {
                    throw new Error("Login failed: token missing");
                }

                localStorage.setItem("token", token);

                console.log(localStorage.getItem("token"));

                const decoded = jwtDecode<DecodedToken>(token);
                console.log("Logged in as:", decoded.sub);

                if (decoded) {
                    navigate('/app/home');
                }

            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.error(err);
                    setError("Invalid email or password");
                } else {
                    console.error("Unknown error during login", err);
                    setError("Invalid email or password");
                }
            } finally {
                setLoading(false);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || "Signup failed");
            } else if (typeof err === "object" && err !== null && "response" in err) {
                // Optionally handle Axios error shape
                // @ts-expect-error TS cannot infer 'response' property
                setError(err.response?.data?.error || "Signup failed");
            } else {
                setError("Signup failed");
            }
        } finally {
            setLoading(false);
        }
    }



    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                    Enter your information below to create your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSignup}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                            <Input
                                id="first_name"
                                type="text"
                                placeholder="John"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                            <Input
                                id="last_name"
                                type="text"
                                placeholder="Doe"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <FieldDescription>
                                We&apos;ll use this to contact you. We will not share your email with anyone else.
                            </FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="confirm_password">Confirm Password</FieldLabel>
                            <Input
                                id="confirm_password"
                                type="password"
                                value={formData.confirm_password}
                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                required
                            />
                        </Field>

                        {error && (
                            <p className="text-red-500 text-sm text-center">{error}</p>
                        )}

                        <FieldGroup>
                            <Field>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Creating..." : "Create Account"}
                                </Button>
                                <FieldDescription className="px-6 text-center">
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        className="text-gray-500 underline cursor-pointer"
                                        onClick={() => navigate("/")}
                                    >
                                        Sign in
                                    </button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}
