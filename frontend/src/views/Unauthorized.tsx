import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { trackUnauthorizedAccess } = useAnalytics();

  useEffect(() => {
    trackUnauthorizedAccess(globalThis.location.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold text-red-600">403 - Unauthorized</h1>
      <p className="mt-4 text-gray-600">
        You do not have permission to view this page.
      </p>
      <Button className="mt-6" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </div>
  );
}