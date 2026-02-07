import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateCompetition, getCompetitionById } from "@/api/CompetitionAPI";
import { type Question } from "../../types/questions/Question.type";
import { type Riddle } from "../../types/riddle/Riddle.type";
import { type UpdateCompetitionProps } from "../../types/competition/EditCompetition.type";
import { getQuestions, getRiddles } from "@/api/QuestionsAPI";
import buildCompetitionEmail from "./BuildEmail";
import { type DropResult } from "@hello-pangea/dnd";

// Specialized Card Components
import { SelectionCard } from "@/components/createActivity/SelectionCard";
import { GeneralInfoCard } from "@/components/createActivity/GeneralInfoCard";
import { GameplayLogicCard } from "@/components/createActivity/GameplayLogicCard";
import { NotificationsCard } from "@/components/createActivity/NotificationsCard";
import { toast } from "sonner";

const Required = () => <span className="text-destructive ml-1">*</span>;

function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}

interface EditCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: number;
  onSuccess?: () => void;
}

export default function EditCompetitionDialog({
  open,
  onOpenChange,
  competitionId,
  onSuccess
}: Readonly<EditCompetitionDialogProps>) {
  const [loading, setLoading] = useState(true);

  // Adjusted names to match what your sub-components expect
  const [generalInfo, setGeneralInfo] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    questionCooldownTime: "300",
    riddleCooldownTime: "60",
  });

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailToAll, setEmailToAll] = useState(false);
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Changed 'body' to 'text' to match your NotificationsCard type
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    text: "",
    sendAtLocal: "",
    sendInOneMinute: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [riddleSearchQuery, setRiddleSearchQuery] = useState("");
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([]);
  const [orderedRiddles, setOrderedRiddles] = useState<Riddle[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [riddles, setRiddles] = useState<Riddle[]>([]);

  useEffect(() => {
    if (!open || !competitionId) return;

    const loadCompetitionData = async () => {
      setLoading(true);
      try {
        const [allQuestions, allRiddles, competitionData] = await Promise.all([
          getQuestions(),
          getRiddles(),
          getCompetitionById(competitionId)
        ]);

        setQuestions(allQuestions);
        setRiddles(allRiddles);

        setGeneralInfo({
          name: competitionData.competitionTitle || "",
          date: competitionData.date || "",
          startTime: competitionData.startTime || "",
          endTime: competitionData.endTime || "",
          location: competitionData.competitionLocation || "",
          questionCooldownTime: competitionData.questionCooldownTime?.toString() || "300",
          riddleCooldownTime: competitionData.riddleCooldownTime?.toString() || "60",
        });

        if (competitionData.selectedQuestions?.length > 0) {
          setOrderedQuestions(competitionData.selectedQuestions
            .map((id: number) => findById(allQuestions, id))
            .filter(Boolean) as Question[]);
        }

        if (competitionData.selectedRiddles?.length > 0) {
          setOrderedRiddles(competitionData.selectedRiddles
            .map((id: number) => findById(allRiddles, id))
            .filter(Boolean) as Riddle[]);
        }

        if (competitionData.emailNotification) {
          setEmailEnabled(true);
          setEmailToAll(competitionData.emailNotification.to === "all participants");
          setEmailData({
            to: competitionData.emailNotification.to || "",
            subject: competitionData.emailNotification.subject || "",
            text: competitionData.emailNotification.body || "",
            sendAtLocal: competitionData.emailNotification.sendAtLocal || "",
            sendInOneMinute: competitionData.emailNotification.sendInOneMinute || false,
          });
        }
      } catch (err) {
        toast.error("Failed to load competition data.");
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };
    loadCompetitionData();
  }, [open, competitionId]);

  useEffect(() => {
    if (emailManuallyEdited || !initialLoadComplete || !emailEnabled) return;
    const autoText = buildCompetitionEmail(generalInfo);
    if (autoText) setEmailData((prev) => ({ ...prev, text: autoText }));
  }, [generalInfo, emailManuallyEdited, initialLoadComplete, emailEnabled]);

  const availableQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !orderedQuestions.some(oq => oq.id === q.id)
  );

  const availableRiddles = riddles.filter(r =>
    r.question.toLowerCase().includes(riddleSearchQuery.toLowerCase()) &&
    !orderedRiddles.some(or => or.id === r.id)
  );

  const moveItem = <T,>(list: T[], setList: React.Dispatch<React.SetStateAction<T[]>>, index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newList.length) {
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      setList(newList);
    }
  };

  const handleInfoChange = (updates: Partial<typeof generalInfo>) => {
    setGeneralInfo(prev => ({ ...prev, ...updates }));
  };

  const handleEmailChange = (updates: Partial<typeof emailData>) => {
    setEmailData(prev => ({ ...prev, ...updates }));
  };

  const handleDragEnd = (result: DropResult, type: 'questions' | 'riddles') => {
    const { source, destination } = result;
    if (!destination) return;

    const isQuestion = type === 'questions';

    const sourceList = (source.droppableId.includes('available')
      ? (isQuestion ? availableQuestions : availableRiddles)
      : (isQuestion ? orderedQuestions : orderedRiddles)) as (Question | Riddle)[];

    const currentOrdered = (isQuestion ? orderedQuestions : orderedRiddles) as (Question | Riddle)[];

    // Create a mutable copy with a clear type
    let newList = [...currentOrdered];

    // 1. Moving from Available to Ordered
    if (source.droppableId.includes('available') && destination.droppableId.includes('ordered')) {
      const itemToAdd = sourceList[source.index];
      newList.splice(destination.index, 0, itemToAdd);
    }
    // 2. Reordering within Ordered
    else if (source.droppableId.includes('ordered') && destination.droppableId.includes('ordered')) {
      const [reorderedItem] = newList.splice(source.index, 1);
      newList.splice(destination.index, 0, reorderedItem);
    }
    // 3. Removing (Moving from Ordered back to Available)
    else if (source.droppableId.includes('ordered') && destination.droppableId.includes('available')) {
      newList = newList.filter((_, idx) => idx !== source.index);
    }

    if (isQuestion) {
      setOrderedQuestions(newList as Question[]);
    } else {
      setOrderedRiddles(newList as Riddle[]);
    }
  };

  const validateForm = () => {
     const newErrors: Record<string, boolean> = {
      name: !generalInfo.name.trim(),
      date: !generalInfo.date,
      startTime: !generalInfo.startTime,
      endTime: !generalInfo.endTime,
      questions: orderedQuestions.length === 0,
      riddles: orderedRiddles.length === 0,
    };
    
    if (Object.values(newErrors).some(v => v)) {
      setErrors(newErrors);
      return "Please fill in all mandatory fields.";
    }

    const competitionStartDateTime = new Date(`${generalInfo.date}T${generalInfo.startTime}`);
    const competitionEndDateTime = new Date(`${generalInfo.date}T${generalInfo.endTime}`);
    if (competitionStartDateTime.getTime() <= Date.now()) {
      setErrors({
        name: false,
        date: true,
        startTime: true,
        endTime: true,
        questions: false,
        riddles: false,
      });
      return "Competition must be scheduled for a future date/time.";
    }

    if (competitionEndDateTime.getTime() <= competitionStartDateTime.getTime()) {
      setErrors({
        name: false,
        date: false,
        startTime: true,
        endTime: true,
        questions: false,
        riddles: false,
      });
      return "Competition end time must be after the start time.";
    }

    if (orderedQuestions.length !== orderedRiddles.length) {
      setErrors({
        name: false,
        date: false,
        startTime: false,
        endTime: false,
        questions: true,
        riddles: true,
      });
      return `Questions and riddles count mismatch.`;
    }

    return null; // No errors
  };

  const handleSubmit = async () => {
    const errorMsg = validateForm();

    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateCompetitionProps = {
        id: competitionId,
        name: generalInfo.name,
        date: generalInfo.date,
        startTime: generalInfo.startTime,
        endTime: generalInfo.endTime,
        location: generalInfo.location || undefined,
        questionCooldownTime: Number.parseInt(generalInfo.questionCooldownTime),
        riddleCooldownTime: Number.parseInt(generalInfo.riddleCooldownTime),
        selectedQuestions: orderedQuestions.map(q => q.id),
        selectedRiddles: orderedRiddles.map(r => r.id),
        emailEnabled,
        emailNotification: emailEnabled ? {
          to: emailToAll ? "all participants" : emailData.to.trim(),
          subject: emailData.subject,
          body: emailData.text, // Mapping back to 'body' for API
          sendInOneMinute: emailData.sendInOneMinute,
          sendAtLocal: emailData.sendAtLocal || undefined,
        } : undefined,
      };

      await updateCompetition(payload);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("An error occurred while updating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDiffColor = (d: string) => {
    const diff = d.toLowerCase();
    if (diff === "easy") return "bg-green-100 text-green-700";
    if (diff === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (loading) return null; // Or your loading dialog

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[95vw] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary">Edit Competition</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 bg-slate-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <GeneralInfoCard
                data={generalInfo}
                onChange={handleInfoChange}
                errors={errors}
              />
              <GameplayLogicCard
                questionCooldown={generalInfo.questionCooldownTime}
                riddleCooldown={generalInfo.riddleCooldownTime}
                onChange={handleInfoChange}
              />
              <NotificationsCard
                emailEnabled={emailEnabled}
                setEmailEnabled={setEmailEnabled}
                emailToAll={emailToAll}
                setEmailToAll={setEmailToAll}
                emailData={emailData}
                onEmailDataChange={handleEmailChange}
                onManualEdit={() => setEmailManuallyEdited(true)}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <SelectionCard<Question>
                title={<span>Coding Questions<Required /></span>}
                description="Drag and drop to select and reorder."
                searchPlaceholder="Search available problems..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                availableItems={availableQuestions}
                orderedItems={orderedQuestions}
                onAdd={(q) => setOrderedQuestions([...orderedQuestions, q])}
                onRemove={(id) => setOrderedQuestions(orderedQuestions.filter(q => q.id !== id))}
                onMove={(idx, dir) => moveItem(orderedQuestions, setOrderedQuestions, idx, dir)}
                onDragEnd={(res) => handleDragEnd(res, 'questions')}
                renderItemTitle={(q) => q.title}
                renderExtraInfo={(q) => (
                  <span className={`text-[10px] w-fit px-1.5 py-0.5 rounded-full ${getDiffColor(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                )}
                droppableIdPrefix="questions"
                onClearAll={() => setOrderedQuestions([])}
                onSelectAll={() => setOrderedQuestions(prev => [...prev, ...availableQuestions])}
                isInvalid={errors.questions}
              />

              <SelectionCard<Riddle>
                title={<span>Riddles<Required /></span>}
                description="Drag riddles into the sequence."
                searchPlaceholder="Search riddles..."
                searchQuery={riddleSearchQuery}
                onSearchChange={setRiddleSearchQuery}
                availableItems={availableRiddles}
                orderedItems={orderedRiddles}
                onAdd={(r) => setOrderedRiddles([...orderedRiddles, r])}
                onRemove={(id) => setOrderedRiddles(orderedRiddles.filter(r => r.id !== id))}
                onMove={(idx, dir) => moveItem(orderedRiddles, setOrderedRiddles, idx, dir)}
                onDragEnd={(res) => handleDragEnd(res, 'riddles')}
                renderItemTitle={(r) => r.question}
                droppableIdPrefix="riddles"
                onClearAll={() => setOrderedRiddles([])}
                onSelectAll={() => setOrderedRiddles(prev => [...prev, ...availableRiddles])}
                isInvalid={errors.riddles}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}