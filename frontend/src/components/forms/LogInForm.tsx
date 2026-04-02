import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleOAuth } from "@react-oauth/google";
import { SiGoogle } from "@icons-pack/react-simple-icons";
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

type GooglePromptNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
};

function getGoogleAccountsId(): GoogleAccountsId | undefined {
  return (
    globalThis.window as Window & {
      google?: { accounts?: { id?: GoogleAccountsId } };
    }
  ).google?.accounts?.id;
}

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
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const { setUser } = useUser();
  const googleButtonInitializedRef = useRef(false);

  const navigate = useNavigate();
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
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
    if (!scriptLoadedSuccessfully || googleButtonInitializedRef.current) return;

    const googleAccounts = getGoogleAccountsId();
    if (!googleAccounts) return;

    googleAccounts.initialize({
      client_id: clientId,
      callback: handleGoogleSuccess,
    });

    googleButtonInitializedRef.current = true;
    setIsGoogleReady(true);
  }, [clientId, handleGoogleSuccess, scriptLoadedSuccessfully]);

  const handleGoogleSignInClick = (): void => {
    const googleAccounts = getGoogleAccountsId();

    if (!googleAccounts || !googleButtonInitializedRef.current) {
      trackLoginFailed("google", "Google identity script unavailable");
      handleGoogleError();
      return;
    }

    trackLoginAttempt("google");

    googleAccounts.prompt((notification: GooglePromptNotification) => {
      if (
        notification?.isNotDisplayed?.() ||
        notification?.isSkippedMoment?.()
      ) {
        trackLoginFailed("google", "Google prompt unavailable");
        toast.error("Google Sign-In was unavailable. Try again later.");
      }
    });
  };

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
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignInClick}
              disabled={!isGoogleReady || loading}
            >
              <SiGoogle className="size-4 shrink-0 text-primary" />
              Sign in with Google
            </Button>
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
