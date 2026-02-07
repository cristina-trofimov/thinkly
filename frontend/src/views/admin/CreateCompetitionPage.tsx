import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCompetition } from "@/api/CompetitionAPI";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { toast } from "sonner";
import type { CompetitionFormPayload } from "@/types/competition/Competition.type";
import { logFrontend } from "@/api/LoggerAPI";

export default function CreateCompetitionPage() {
  const navigate = useNavigate();

  const handleCreate = async (payload: CompetitionFormPayload) => {
    try {
      await createCompetition(payload);
      navigate("/app/dashboard/competitions", { state: { success: true }, replace: true });
    } catch (err) {
      toast.error("Failed to create competition.");
      logFrontend({
        level: 'ERROR',
        message: `An error occurred. Reason: ${err}`,
        component: 'CreateCompetitionPage',
        url: window.location.href,
        stack: (err as Error).stack,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => navigate(-1)}>
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