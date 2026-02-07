import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type DropResult } from "@hello-pangea/dnd";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createCompetition } from "@/api/CompetitionAPI";
import { logFrontend } from "@/api/LoggerAPI";
import { getQuestions, getRiddles } from "@/api/QuestionsAPI";
import buildCompetitionEmail from "@/components/manageCompetitions/BuildEmail";
import { type CreateCompetitionProps } from "@/types/competition/CreateCompetition.type";
import { type Question } from "@/types/questions/Question.type";
import { type Riddle } from "@/types/riddle/Riddle.type";
import { SelectionCard } from "@/components/createActivity/SelectionCard";
import { GeneralInfoCard } from "@/components/createActivity/GeneralInfoCard";
import { GameplayLogicCard } from "@/components/createActivity/GameplayLogicCard";
import { NotificationsCard } from "@/components/createActivity/NotificationsCard";

interface PydanticError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

const Required = () => <span className="text-destructive ml-1">*</span>;

export default function CreateCompetition() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    questionCooldownTime: "300",
    riddleCooldownTime: "60",
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailToAll, setEmailToAll] = useState(true);
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "Upcoming Competition Reminder",
    text: "",
    sendAtLocal: "",
    sendInOneMinute: false,
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [riddleSearchQuery, setRiddleSearchQuery] = useState("");

  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([]);
  const [orderedRiddles, setOrderedRiddles] = useState<Riddle[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [riddles, setRiddles] = useState<Riddle[]>([]);

  useEffect(() => {
    if (emailManuallyEdited) return;
    const autoText = buildCompetitionEmail(formData);
    if (autoText) {
      setEmailData((prev) => ({ ...prev, text: autoText }));
    }
  }, [formData, emailManuallyEdited]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [qData, rData] = await Promise.all([getQuestions(), getRiddles()]);
        setQuestions(qData || []);
        setRiddles(rData || []);
      } catch (err) {
        logFrontend({
          level: 'ERROR',
          message: `Failed to load selection data: ${(err as Error).message}`,
          component: 'CreateCompetitionPage',
          url: globalThis.location.href,
        });
      }
    };
    loadData();
  }, []);

  // Filter available items (excluding those already in the ordered lists)
  const availableQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !orderedQuestions.some(oq => oq.id === q.id)
  );

  const availableRiddles = riddles.filter(r =>
    r.question.toLowerCase().includes(riddleSearchQuery.toLowerCase()) &&
    !orderedRiddles.some(or => or.id === r.id)
  );

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

  const moveItem = <T,>(list: T[], setList: React.Dispatch<React.SetStateAction<T[]>>, index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newList.length) {
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      setList(newList);
    }
  };

  const validateForm = (): string | null => {
    const newErrors: Record<string, boolean> = {
      name: !formData.name.trim(),
      date: !formData.date,
      startTime: !formData.startTime,
      endTime: !formData.endTime,
      questions: orderedQuestions.length === 0,
      riddles: orderedRiddles.length === 0,
    };

    if (Object.values(newErrors).some(v => v)) {
      setErrors(newErrors);
      return "Please fill in all mandatory fields.";
    }

    const competitionStartDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const competitionEndDateTime = new Date(`${formData.date}T${formData.endTime}`);
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
      const sendAtUTC = emailData.sendAtLocal
        ? new Date(emailData.sendAtLocal).toISOString()
        : undefined;

      const payload: CreateCompetitionProps = {
        name: formData.name.trim(),
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location?.trim() || undefined,
        questionCooldownTime: Number.parseInt(formData.questionCooldownTime) || 300,
        riddleCooldownTime: Number.parseInt(formData.riddleCooldownTime) || 60,
        selectedQuestions: orderedQuestions.map(q => Number(q.id)),
        selectedRiddles: orderedRiddles.map(r => Number(r.id)),
        emailEnabled,
        emailNotification: emailEnabled ? {
          to: emailToAll ? "all participants" : emailData.to.trim(),
          subject: emailData.subject.trim(),
          body: emailData.text.trim(),
          sendInOneMinute: emailData.sendInOneMinute,
          sendAtLocal: sendAtUTC,
        } : undefined,
      };

      await createCompetition(payload);

      // Navigate back with a success flag in the location state
      navigate("/app/dashboard/competitions", {
        state: { success: true, refresh: Date.now() },
        replace: true
      });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string | PydanticError[] }; status?: number };
        message?: string;
      };

      const responseData = error.response?.data;
      const detail = responseData?.detail;
      const status = error.response?.status;
      let errorMsg = "Failed to create competition.";

      if (status === 401) {
        errorMsg = "Unauthorized: Please log in again.";
      } else if (Array.isArray(detail)) {
        errorMsg = `Validation Error: ${detail.map((d: PydanticError) => d.msg).join(", ")}`;
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      }

      toast.error(errorMsg); // Immediate error feedback via sonner

      logFrontend({
        level: 'ERROR',
        message: `Submission error: ${error.message ?? "Unknown Error"}`,
        component: 'CreateCompetitionPage',
        url: globalThis.location.href,
      });
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b -mx-6 px-6 pb-6 pt-2 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Create New Competition</h1>
            <p className="text-muted-foreground text-sm">Configure the logic, timeline, and participants for a new event.</p>
          </div>
          <div className="flex gap-3 h-fit mt-auto">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? "Publishing..." : "Publish Competition"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <GeneralInfoCard
            data={formData}
            errors={errors}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          <GameplayLogicCard
            questionCooldown={formData.questionCooldownTime}
            riddleCooldown={formData.riddleCooldownTime}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          <NotificationsCard
            emailEnabled={emailEnabled}
            setEmailEnabled={setEmailEnabled}
            emailToAll={emailToAll}
            setEmailToAll={setEmailToAll}
            emailData={emailData}
            onEmailDataChange={(updates) => setEmailData(prev => ({ ...prev, ...updates }))}
            onManualEdit={() => setEmailManuallyEdited(true)}
          />
        </div>

        <div className="lg:col-span-2 space-y-8">
          {/* Questions Section */}
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
            onSelectAll={() => {
              setOrderedQuestions(prev => [...prev, ...availableQuestions]);
            }}
            isInvalid={errors.questions}
          />

          {/* Riddles Section */}
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
            onSelectAll={() => {
              setOrderedRiddles(prev => [...prev, ...availableRiddles]);
            }}
            isInvalid={errors.riddles}
          />
        </div>
      </div>
    </div>
  );
}