import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "@/api/AuthAPI";
import thinkly from "@/assets/thinkly_logo.png";
import { logFrontend } from "@/api/LoggerAPI";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await forgotPassword({ email });
      toast.success(
        "If the account exists, a password reset email has been sent."
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const isError = err instanceof Error;
      const errorMessage = isError
        ? err.message
        : "Unknown error during reset password request.";

      logFrontend({
        level: "ERROR",
        message: `API Error: Failed to send reset email: ${errorMessage}`,
        component: "ForgotPasswordForm",
        url: window.location.href,
        stack: isError ? err.stack : undefined, // Safely access stack
      });
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[80vh] gap-6",
        className
      )}
      {...props}
    >
      <div className="flex justify-center gap-2 md:justify-start">
        <Link to="/" className="flex items-center gap-2 font-medium">
          <div className="text-primary-foreground flex size-10 items-center justify-center rounded-md">
            <img src={thinkly} alt="scs logo" className="size-10" />
          </div>
          <span className="font-semibold">Thinkly</span>
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email below and we will send a link to reset your
            password if the account exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel className="font-semibold" htmlFor="email">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="me@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                />
              </Field>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-500">{success}</p>}

              <Field className="flex flex-col gap-2 mt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
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
        </CardContent>
      </Card>
    </div>
  );
}
