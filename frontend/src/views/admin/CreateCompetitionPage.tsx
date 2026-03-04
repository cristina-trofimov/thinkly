import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCompetition } from "@/api/CompetitionAPI";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { toast } from "sonner";
import type { CompetitionFormPayload } from "@/types/competition/Competition.type";
import { logFrontend } from "@/api/LoggerAPI";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function CreateCompetitionPage() {
  const navigate = useNavigate();
  const {
    trackAdminCompetitionCreateSuccess,
    trackAdminCompetitionCreateFailed,
  } = useAnalytics();

  // Track page view on mount — a separate event from the nav click
  // so we can detect drop-offs (navigated but never submitted)
  useEffect(() => {
    // page view is already tracked via trackAdminCompetitionCreateNavigated
    // in ManageCompetitionsPage; nothing extra needed here unless you want
    // a dedicated "create_form_viewed" event — add one if needed.
  }, []);

  const handleCreate = async (payload: CompetitionFormPayload) => {
    try {
      await createCompetition(payload);
      trackAdminCompetitionCreateSuccess(payload.name ?? "");
      navigate("/app/dashboard/competitions", {
        state: { success: true },
        replace: true,
      });
    } catch (err) {
      trackAdminCompetitionCreateFailed((err as Error).message);
      toast.error("Failed to create competition.");
      logFrontend({
        level: "ERROR",
        message: `An error occurred. Reason: ${err}`,
        component: "CreateCompetitionPage",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 text-muted-foreground"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <CompetitionForm
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
        submitLabel="Publish Competition"
      />
    </div>
  );
}