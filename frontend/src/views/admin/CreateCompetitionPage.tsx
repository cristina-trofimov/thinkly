import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type DropResult } from "@hello-pangea/dnd";
import {
  X, Trophy, Mail, Clock, MapPin, ArrowLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeInput } from "@/helpers/TimeInput";
import DatePicker from "@/helpers/DatePicker";
import { toast } from "sonner";
import { createCompetition } from "@/api/CompetitionAPI";
import { logFrontend } from "@/api/LoggerAPI";
import { getQuestions, getRiddles } from "@/api/QuestionsAPI";
import buildCompetitionEmail from "@/components/manageCompetitions/BuildEmail";
import { type CreateCompetitionProps } from "@/types/competition/CreateCompetition.type";
import { type Question } from "@/types/questions/Question.type";
import { type Riddle } from "@/types/riddle/Riddle.type";
import { SelectionCard } from "@/components/questionsAndRiddles/SelectionCard";

interface PydanticError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

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

  const [validationError, setValidationError] = useState('');
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

    // We explicitly tell TS these are arrays of the union type to allow shared methods
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

    // Final update: cast back to the specific expected state type
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

  const validateForm = () => {
    if (!formData.name.trim() || !formData.date || !formData.startTime || !formData.endTime) {
      setValidationError("Please fill in all general information fields.");
      return false;
    }

    const competitionDateTime = new Date(`${formData.date}T${formData.startTime}`);
    if (competitionDateTime.getTime() <= Date.now()) {
      setValidationError("Competition must be scheduled for a future date/time.");
      return false;
    }

    if (orderedQuestions.length === 0 || orderedRiddles.length === 0) {
      setValidationError("Select at least one question and one riddle.");
      return false;
    }

    if (orderedQuestions.length !== orderedRiddles.length) {
      setValidationError(`Count mismatch: ${orderedQuestions.length} Questions vs ${orderedRiddles.length} Riddles.`);
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setValidationError('');

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

      setValidationError(errorMsg);
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

        {validationError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <X className="h-4 w-4" />
            <span className="font-medium text-xs">{validationError}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> General Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Winter Hackathon 2024" /></div>
              <div className="space-y-2">
                <Label htmlFor="date">Event Date</Label>
                <DatePicker
                  id="date"
                  value={formData.date}
                  onChange={(v) => setFormData({ ...formData, date: v })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="startTime">Start</Label><TimeInput id="startTime" value={formData.startTime} onChange={value => setFormData({ ...formData, startTime: value })} /></div>
                <div className="space-y-2"><Label htmlFor="endTime">End</Label><TimeInput id="endTime" value={formData.endTime} onChange={value => setFormData({ ...formData, endTime: value })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label><Input id="location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Online or Physical Address" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Gameplay Logic</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="qCool">Question Cooldown (s)</Label><Input id="qCool" type="number" value={formData.questionCooldownTime} onChange={e => setFormData({ ...formData, questionCooldownTime: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="rCool">Riddle Cooldown (s)</Label><Input id="rCool" type="number" value={formData.riddleCooldownTime} onChange={e => setFormData({ ...formData, riddleCooldownTime: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label htmlFor="enEmail">Enable Emails</Label><Switch id="enEmail" checked={emailEnabled} onCheckedChange={setEmailEnabled} /></div>
              {emailEnabled && (
                <div className="space-y-4 pt-2 border-t mt-2">
                  <div className="flex items-center justify-between"><Label htmlFor="allPart" className="text-xs">Send to all participants</Label><Switch id="allPart" checked={emailToAll} onCheckedChange={setEmailToAll} /></div>
                  {!emailToAll && (
                    <div className="space-y-1"><Label className="text-xs font-semibold">To (comma-separated)</Label><Input placeholder="alice@example.com" value={emailData.to} onChange={e => setEmailData({ ...emailData, to: e.target.value })} /></div>
                  )}
                  <div className="space-y-1"><Label className="text-xs font-semibold">Subject</Label><Input value={emailData.subject} onChange={e => setEmailData({ ...emailData, subject: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold">Message Content</Label><Textarea rows={4} className="text-xs" value={emailData.text} onChange={e => { setEmailManuallyEdited(true); setEmailData({ ...emailData, text: e.target.value }); }} /></div>
                  <div className="grid gap-2">
                    <Label htmlFor="sendAtLocal">Additional custom reminder</Label>
                    <Input
                      id="sendAtLocal"
                      type="datetime-local"
                      step="1"
                      value={emailData.sendAtLocal}
                      onChange={(e) => setEmailData({ ...emailData, sendAtLocal: e.target.value })}
                    />
                  </div>
                </div>


              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {/* Questions Section */}
          <SelectionCard<Question>
            title="Coding Questions"
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
          />

          {/* Riddles Section */}
          <SelectionCard<Riddle>
            title="Riddles"
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
          />
        </div>
      </div>
    </div>
  );
}