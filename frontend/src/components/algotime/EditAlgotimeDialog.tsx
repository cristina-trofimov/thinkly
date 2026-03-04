import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2} from "lucide-react";
import {  getAlgotimeById} from "@/api/AlgotimeAPI"
import {AlgoTimeSessionForm}from "../forms/AlgoTimeForm";

interface EditAlgoTimeSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId: number;
    onSuccess: () => void;
  }
  
  export const EditAlgoTimeSessionDialog = ({
    open,
    onOpenChange,
    sessionId,
    onSuccess,
  }: EditAlgoTimeSessionDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<{
      sessionId: number;
      name: string;
      date: string;
      startTime: string;
      endTime: string;
      questionCooldown: number;
      selectedQuestions: number[];
    } | null>(null);
  
    useEffect(() => {
      if (!open) return;
  
      const load = async () => {
        setLoading(true);
        try {
          const session = await getAlgotimeById(sessionId);
  
          setInitialData({
            sessionId,
            name: session.eventName ?? "",
            date: format(session.startTime, "yyyy-MM-dd"),
            startTime: format(session.startTime, "HH:mm"),
            endTime: format(session.endTime, "HH:mm"),
            questionCooldown: session.questionCooldown ?? 300,
            selectedQuestions:
              session.questions?.map((q: { questionId: number }) => q.questionId) ?? [],
          });
        } catch {
          toast.error("Failed to load session details");
          onOpenChange(false);
        } finally {
          setLoading(false);
        }
      };
  
      load();
    }, [open, sessionId]);
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogOverlay className="bg-white/10 backdrop-blur-sm" />
        <DialogContent className="!w-[95vw] !max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          </DialogHeader>
  
          {loading || !initialData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AlgoTimeSessionForm
              mode="edit"
              initialData={initialData}
              onSuccess={() => {
                onSuccess();
                onOpenChange(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  };