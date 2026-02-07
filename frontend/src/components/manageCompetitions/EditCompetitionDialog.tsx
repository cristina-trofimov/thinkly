import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateCompetition, getCompetitionById } from "@/api/CompetitionAPI";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { CompetitionFormPayload } from "@/types/competition/Competition.type";
import { logFrontend } from "@/api/LoggerAPI";

interface EditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: number;
  onSuccess?: () => void;
}

export default function EditCompetitionDialog({ open, onOpenChange, competitionId, onSuccess }: EditProps) {
  const [initialData, setInitialData] = useState<CompetitionFormPayload>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && competitionId) {
      setLoading(true);
      getCompetitionById(competitionId)
        .then((data) => {
          setInitialData(data);
          setLoading(false);
        })
        .catch(() => {
          toast.error("Failed to fetch competition details.");
          onOpenChange(false);
        });
    }
  }, [open, competitionId, onOpenChange]);

  const handleUpdate = async (payload: CompetitionFormPayload) => {
    try {
      await updateCompetition({ ...payload, id: competitionId });
      toast.success("Competition updated!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Update failed.");
      logFrontend({
        level: 'ERROR',
        message: `An error occurred. Reason: ${err}`,
        component: 'EditCompetitionDialog',
        url: window.location.href,
        stack: (err as Error).stack,
      });
    }
  };

  if (loading && open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Screen readers need a Title inside DialogContent */}
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Edit Competition</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>

        <div className="flex-1 min-h-0 w-full p-6 overflow-y-auto">
          <CompetitionForm
            initialData={initialData}
            onSubmit={handleUpdate}
            onCancel={() => onOpenChange(false)}
            submitLabel="Save Changes"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}