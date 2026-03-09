import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Pencil} from "lucide-react";
import {  getAlgotimeById,} from "@/api/AlgotimeAPI"
import { getQuestions } from "@/api/QuestionsAPI";
import {AlgoTimeSessionForm}from "../forms/AlgoTimeForm";
import { Button } from "@/components/ui/button";
import type { Question } from "@/types/questions/Question.type";

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
    const [allQuestions, setAllQuestions] = useState<Question[]>([]); 
    const [initialData, setInitialData] = useState<{
      sessionId: number;
      name: string;
      date: string;
      startTime: string;
      endTime: string;
      questionCooldown: number;
      selectedQuestions: number[];
      location: string; 
    } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const getDifficultyClass = (difficulty: string) => {
      const lower = difficulty.toLowerCase();
      if (lower === "easy") return "bg-green-100 text-green-700";
      if (lower === "medium") return "bg-yellow-100 text-yellow-700";
      return "bg-red-100 text-red-700";
    };
  
    useEffect(() => {
      if (!open) return;
  
      const load = async () => {
        setLoading(true);
        try {
          
          const [session, questions] = await Promise.all([
            getAlgotimeById(sessionId),
            getQuestions(),
          ]);
          setAllQuestions(questions ?? []);
  
          setInitialData({
            sessionId,
            name: session.eventName ?? "",
            date: format(session.startTime, "yyyy-MM-dd"),
            startTime: format(session.startTime, "HH:mm"),
            endTime: format(session.endTime, "HH:mm"),
            questionCooldown: session.questionCooldown ?? 300,
            selectedQuestions:
              session.questions?.map((q: { questionId: number }) => q.questionId) ?? [],
            location: session.location ?? "",
          });
          const now = new Date();
          const endTime = new Date(session.endTime);
          setIsCompleted(now > endTime);
        } catch {
          toast.error("Failed to load session details");
          onOpenChange(false);
        } finally {
          setLoading(false);
        }
      };
  
      load();
    }, [open, sessionId]);

    useEffect(() => {
      if (!open) setIsEditing(false);
    }, [open]);

    const renderContent = () => {
      if (loading || !initialData) {
        return (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      }
    
      if (isEditing) {
        return (
          <AlgoTimeSessionForm
            mode="edit"
            initialData={initialData}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
          />
        );
      }
    
      return (
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Session Name</p>
                <p className="text-sm font-medium mt-1">{initialData.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Date</p>
                <p className="text-sm font-medium mt-1">{initialData.date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Time</p>
                <p className="text-sm font-medium mt-1">{initialData.startTime} – {initialData.endTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Question Cooldown</p>
                <p className="text-sm font-medium mt-1">{initialData.questionCooldown}s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                <p className="text-sm font-medium mt-1">{initialData.location || "—"}</p>
              </div>
            </div>
    
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                Questions ({initialData.selectedQuestions.length})
              </p>
              <div className="space-y-2">
                {initialData.selectedQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No questions selected</p>
                ) : (
                  initialData.selectedQuestions.map((qId) => {
                    const question = allQuestions.find((q) => q.question_id === qId);
                    return (
                      <div key={qId} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">
                          {question?.question_name ?? `Question ${qId}`}
                        </span>
                        {question && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyClass(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };
    
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogOverlay className="bg-white/10 backdrop-blur-sm" />
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${isEditing ? "!w-[95vw] !max-w-[95vw]" : "!w-[50vw] !max-w-[50vw]"}`}>
          <DialogHeader>
          <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-primary">
                {isEditing ? '' : "View AlgoTime Session"}
              </DialogTitle>
              {!isEditing && (
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                        Completed Session — Read Only
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
            </div>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
    );
  };