import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCompetition } from "@/api/CompetitionAPI";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { toast } from "sonner";

export default function CreateCompetitionPage() {
  const navigate = useNavigate();

  const handleCreate = async (payload: any) => {
    try {
      await createCompetition(payload);
      toast.success("Competition created!");
      navigate("/app/dashboard/competitions", { state: { success: true }, replace: true });
    } catch (err) {
      toast.error("Failed to create competition.");
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