import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";

const ErrorPage = () => {
  const navigate = useNavigate();
  const { trackPageNotFound } = useAnalytics();

  useEffect(() => {
    trackPageNotFound(globalThis.location.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full flex flex-col items-center text-center gap-8">

        {/* Large 404 */}
        <div className="relative select-none">
          <span className="text-[10rem] font-bold leading-none text-primary/10 tracking-tighter">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-primary tracking-tight">
            404
          </span>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            Page not found
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            The page you're looking for doesn't exist or may have been moved.
            Head back home and try again.
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-border" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate("/app")}>
            Go back home
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>

      </div>
    </section>
  );
};

export default ErrorPage;