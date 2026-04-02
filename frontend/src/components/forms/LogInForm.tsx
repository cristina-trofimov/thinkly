import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getProfile, googleLogin, login } from "@/api/AuthAPI";
import type { LoginRequest, DecodedToken } from "../../types/Auth.type";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { logFrontend } from "@/api/LoggerAPI";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getUserPreferences } from "@/api/AccountsAPI";
import { useUser } from "@/context/UserContext";

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleButtonWidth, setGoogleButtonWidth] = useState<number>();
  const { setUser } = useUser();
  const googleButtonWrapperRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const {
    identifyUser,
    trackLoginAttempt,
    trackLoginSuccess,
    trackLoginFailed,
  } = useAnalytics();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    trackLoginAttempt("email_password");

    setError(null);
    setLoading(true);

    try {
      const { access_token: token } = await login(form);
      localStorage.setItem("token", token);

      const decoded = jwtDecode<DecodedToken>(token);

      const profile = await getProfile();
      const prefs = await getUserPreferences(profile.id);

      localStorage.setItem("theme", prefs.theme ?? "light");
      if (prefs.theme === "dark") document.documentElement.classList.add("dark");

      setUser(profile);

      trackLoginSuccess("email_password");

      identifyUser({
        id: decoded.id,
        email: decoded.sub,
        firstName: "",
        lastName: "",
        role: decoded.role ?? "participant",
      });

      if (decoded) {
        navigate("/app/home");
      }
    } catch (err) {
      trackLoginFailed(
        "email_password",
        err instanceof Error ? err.message : "Unknown error"
      );

      const isError = err instanceof Error;
      const errorMessage = isError
        ? err.message
        : "Unknown error during login.";

      logFrontend({
        level: "ERROR",
        message: `API Error: Failed to login: ${errorMessage}`,
        component: "LoginForm",
        url: globalThis.location.href,
        stack: isError ? err.stack : undefined,
      });

      toast.error("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: GoogleCredentialResponse): Promise<void> => {
      try {
        const { credential } = credentialResponse;
        if (!credential) {
          throw new Error("No credential returned by Google");
        }

        const res = await googleLogin(credential);
        const { access_token: token } = res;
        localStorage.setItem("token", token);

        const decoded = jwtDecode<DecodedToken>(token);

        trackLoginSuccess("google");

        // Identify the user so all future events are tied to them
        identifyUser({
          id: decoded.id,
          email: decoded.sub ?? "",
          firstName: "",
          lastName: "",
          role: decoded.role ?? "participant",
        });

        if (decoded) {
          navigate("/app/home");
        }
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError
          ? err.message
          : "Unknown error during Google login.";

        trackLoginFailed("google", errorMessage);

        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to login using Google: ${errorMessage}`,
          component: "LoginForm",
          url: globalThis.location.href,
          stack: isError ? err.stack : undefined,
        });

        toast.error("Google login failed. Please try again.");
      }
    },
    [identifyUser, navigate, trackLoginFailed, trackLoginSuccess]
  );

  const handleGoogleError = useCallback((): void => {
    trackLoginFailed("google", "Google Sign-In widget error");
    toast.error("Google Sign-In was unsuccessful. Try again later.");
  }, [trackLoginFailed]);

  useEffect(() => {
    const wrapper = googleButtonWrapperRef.current;
    if (!wrapper) return;

    const updateWidth = (): void => {
      const nextWidth = Math.floor(wrapper.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setGoogleButtonWidth((currentWidth) =>
          currentWidth === nextWidth ? currentWidth : nextWidth
        );
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(wrapper);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={cn("flex flex-col gap-6 w-full max-w-md mx-auto", className)}
      {...props}
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Login to your account</h1>
            <p className="text-sm text-gray-500">
              Enter your email below to login to your account
            </p>
          </div>
          <Field>
            <FieldLabel className="font-semibold" htmlFor="email">
              Email
            </FieldLabel>
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
            <FieldLabel className="font-semibold" htmlFor="password">
              Password
            </FieldLabel>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="off"
              required
            />
            <FieldDescription className="text-right">
              <button
                type="button"
                className="cursor-pointer text-sm text-gray-500 underline hover:text-gray-700"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </button>
            </FieldDescription>
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Field className="flex flex-col">
            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Field>
          <FieldSeparator>Or continue with</FieldSeparator>
          <Field>
            <div ref={googleButtonWrapperRef} className="w-full">
              <GoogleLogin
                onSuccess={(response) => {
                  trackLoginAttempt("google");
                  void handleGoogleSuccess(response);
                }}
                onError={handleGoogleError}
                width={googleButtonWidth}
                containerProps={{ className: "w-full" }}
              />
            </div>
            <FieldDescription className="text-center">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="text-gray-500 underline cursor-pointer"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
