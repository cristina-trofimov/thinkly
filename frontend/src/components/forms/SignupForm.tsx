import { login, signup } from "@/api/AuthAPI";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { DecodedToken } from "../../types/Auth.type";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logFrontend } from "@/api/LoggerAPI";
import { toast } from "sonner";

function getSignupErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    // @ts-expect-error TS cannot infer 'response' property
    return err.response?.data?.error || "Signup failed";
  }
  if (err instanceof Error) {
    return err.message || "Signup failed";
  }
  return "Signup failed";
}

function handleLoginError(err: unknown, setError: (msg: string) => void): void {
  const isError = err instanceof Error;
  const errorMessage = isError ? err.message : "Unknown error during login.";
  const logMessage = isError
    ? `Invalid email or password: ${errorMessage}`
    : `Unknown error during login: ${errorMessage}`;

  logFrontend({
    level: "ERROR",
    message: logMessage,
    component: "SignupForm",
    url: globalThis.location.href,
    stack: isError ? err.stack : undefined,
  });

  setError("Invalid email or password");
}

export function SignupForm() {
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

  async function loginAfterSignup(): Promise<void> {
    const { token } = await login({
      email: formData.email,
      password: formData.password,
    });

    if (!token) {
      throw new Error("Login failed: token missing");
    }

    localStorage.setItem("token", token);
    console.log(localStorage.getItem("token"));

    const decoded = jwtDecode<DecodedToken>(token);
    console.log("Logged in as:", decoded.sub);

    logFrontend({
      level: "INFO",
      message: `Logged in as: ${decoded.sub}`,
      component: "SignupForm",
      url: globalThis.location.href,
    });

    if (decoded) {
      navigate("/app/home");
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.first_name,
        lastName: formData.last_name,
      });

      toast.success("Account created successfully!");

      try {
        await loginAfterSignup();
      } catch (err: unknown) {
        handleLoginError(err, setError);
      }
    } catch (err: unknown) {
      toast.error(getSignupErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignup}>
      <FieldGroup>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Create an account</h1>
          <p className="text-sm text-gray-500">
            Fill in the information below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel className="font-semibold" htmlFor="first_name">
            First Name
          </FieldLabel>
          <Input
            id="first_name"
            type="text"
            placeholder="John"
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            required
          />
        </Field>

        <Field>
          <FieldLabel className="font-semibold" htmlFor="last_name">
            Last Name
          </FieldLabel>
          <Input
            id="last_name"
            type="text"
            placeholder="Doe"
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            required
          />
        </Field>

        <Field>
          <FieldLabel className="font-semibold" htmlFor="email">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel className="font-semibold" htmlFor="password">
            Password
          </FieldLabel>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />
        </Field>

        <Field>
          <FieldLabel className="font-semibold" htmlFor="confirm_password">
            Confirm Password
          </FieldLabel>
          <Input
            id="confirm_password"
            type="password"
            value={formData.confirm_password}
            onChange={(e) =>
              setFormData({ ...formData, confirm_password: e.target.value })
            }
            required
          />
        </Field>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

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
  );
}
