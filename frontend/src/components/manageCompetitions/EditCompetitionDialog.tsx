import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Trophy,
  Mail,
  Clock,
  MapPin,
} from "lucide-react";
import { updateCompetition, getCompetitionById } from "@/api/CompetitionAPI";
import { logFrontend } from "@/api/LoggerAPI";
import { type Question } from "../../types/questions/Question.type";
import { type Riddle } from "../../types/riddle/Riddle.type";
import { type UpdateCompetitionProps } from "../../types/competition/EditCompetition.type";
import { getQuestions, getRiddles } from "@/api/QuestionsAPI";
import buildCompetitionEmail from "./BuildEmail";

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
}: EditCompetitionDialogProps) {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    questionCooldownTime: "",
    riddleCooldownTime: "",
  });
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailToAll, setEmailToAll] = useState(false);
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    body: "",
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

  // Load competition data when dialog opens
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

        setFormData({
          name: competitionData.competitionTitle || "",
          date: competitionData.date || "",
          startTime: competitionData.startTime || "",
          endTime: competitionData.endTime || "",
          location: competitionData.competitionLocation || "",
          questionCooldownTime: competitionData.questionCooldownTime?.toString() || "300",
          riddleCooldownTime: competitionData.riddleCooldownTime?.toString() || "60",
        });

        if (competitionData.selectedQuestions && competitionData.selectedQuestions.length > 0) {
          const orderedQs = competitionData.selectedQuestions
            .map((id: number) => findById(allQuestions, id))
            .filter(Boolean) as Question[];
          setOrderedQuestions(orderedQs);
        }

        if (competitionData.selectedRiddles && competitionData.selectedRiddles.length > 0) {
          const orderedRs = competitionData.selectedRiddles
            .map((id: number) => findById(allRiddles, id))
            .filter(Boolean) as Riddle[];
          setOrderedRiddles(orderedRs);
        }

        if (competitionData.emailNotification) {
          setEmailEnabled(true);
          setEmailToAll(competitionData.emailNotification.to === "all participants");
          setEmailData({
            to: competitionData.emailNotification.to || "",
            subject: competitionData.emailNotification.subject || "",
            body: competitionData.emailNotification.body || "",
            sendAtLocal: competitionData.emailNotification.sendAtLocal || "",
            sendInOneMinute: competitionData.emailNotification.sendInOneMinute || false,
          });
        } else {
          setEmailEnabled(false);
          setEmailToAll(false);
          setEmailData({
            to: "",
            subject: "",
            body: "",
            sendAtLocal: "",
            sendInOneMinute: false,
          });
        }

      } catch (err) {
        console.error('Error loading competition data:', err);
        logFrontend({
          level: 'ERROR',
          message: `Failed to load competition data: ${(err as Error).message}`,
          component: 'EditCompetitionDialog.tsx',
          url: window.location.href,
          stack: (err as Error).stack,
        });
        setValidationError("Failed to load competition data. Please try again.");
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    loadCompetitionData();
  }, [open, competitionId]);

  useEffect(() => {
    setEmailManuallyEdited(false);
  }, [
    formData.name,
    formData.date,
    formData.startTime,
    formData.endTime,
    formData.location,
  ]);

  useEffect(() => {
    if (emailManuallyEdited || !initialLoadComplete || !emailEnabled) return;

    const autoText = buildCompetitionEmail(formData);
    if (autoText) {
      setEmailData((prev) => ({ ...prev, body: autoText }));
    }
  }, [
    formData.name,
    formData.date,
    formData.startTime,
    formData.endTime,
    formData.location,
    emailManuallyEdited,
    initialLoadComplete,
    emailEnabled
  ]);

  const filteredQuestions = questions.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !orderedQuestions.find(oq => oq.id === q.id)
  );

  const filteredRiddles = riddles.filter((r) =>
    r.question.toLowerCase().includes(riddleSearchQuery.toLowerCase()) &&
    !orderedRiddles.find(or => or.id === r.id)
  );

  const moveItem = <T,>(
    list: T[],
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    direction: 'up' | 'down'
  ) => {
    const newList = [...list];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newList.length) {
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      setList(newList);
    }
  };

  const validateForm = () => {
    if (formData.name.trim() === '' || formData.date === '' || formData.startTime === '' || formData.endTime === '') {
      setValidationError("Incomplete general information.");
      return false;
    }

    if (orderedQuestions.length === 0) {
      setValidationError("Please select at least one question.");
      return false;
    }
    if (orderedRiddles.length === 0) {
      setValidationError("Please select at least one riddle.");
      return false;
    }
    if (orderedQuestions.length !== orderedRiddles.length) {
      setValidationError("You must have the same number of questions and riddles.");
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      const payload: UpdateCompetitionProps= {
        id: competitionId,
        name: formData.name,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location || undefined,
        questionCooldownTime: Number.parseInt(formData.questionCooldownTime) || 300,
        riddleCooldownTime: Number.parseInt(formData.riddleCooldownTime) || 60,
        selectedQuestions: orderedQuestions.map(q => q.id),
        selectedRiddles: orderedRiddles.map(r => r.id),
        emailEnabled,
        emailNotification: emailEnabled ? {
          to: emailToAll ? "all participants" : emailData.to.trim(),
          subject: emailData.subject,
          body: emailData.body,
          sendInOneMinute: emailData.sendInOneMinute,
          sendAtLocal: emailData.sendAtLocal || undefined,
        } : undefined,
      };

      await updateCompetition(payload);
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error("Failed to update competition:", error);
      logFrontend({
        level: 'ERROR',
        message: `Failed to update competition: ${(error as Error).message}`,
        component: 'EditCompetitionDialog.tsx',
        url: window.location.href,
        stack: (error as Error).stack,
      });
      setValidationError("Failed to update competition. Please try again.");
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

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[95vw] max-h-[95vh]">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading competition data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] max-h-[95vh] p-0 gap-0">
        <div className="sticky top-0 z-30 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-primary">Edit Competition</DialogTitle>
              <p className="text-sm text-muted-foreground">Update the competition details below.</p>
            </DialogHeader>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {validationError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg flex items-center gap-3 mt-3">
              <X className="h-4 w-4" />
              <span className="font-medium text-xs">{validationError}</span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-140px)] px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> General Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Winter Hackathon 2024" /></div>
                  <div className="space-y-2"><Label htmlFor="date">Event Date</Label><Input id="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="startTime">Start</Label><Input id="startTime" type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="endTime">End</Label><Input id="endTime" type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} /></div>
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
                      <div className="space-y-1"><Label className="text-xs font-semibold">Message Content</Label><Textarea rows={4} className="text-xs" value={emailData.body} onChange={e => { setEmailManuallyEdited(true); setEmailData({ ...emailData, body: e.target.value }); }} /></div>
                      <div className="grid gap-2">
                        <Label htmlFor="sendAtLocal">Additional custom reminder</Label>
                        <Input id="sendAtLocal" type="datetime-local" value={emailData.sendAtLocal} onChange={(e) => setEmailData({ ...emailData, sendAtLocal: e.target.value })} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Coding Questions</CardTitle>
                      <p className="text-sm text-muted-foreground">Select and order the problems.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">{orderedQuestions.length}</span>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Selected</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search available problems..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-xl bg-slate-50/50 p-4 max-h-[400px] overflow-y-auto space-y-2">
                      {filteredQuestions.map(q => (
                        <div key={q.id} className="group bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between hover:border-primary transition-all">
                          <div className="flex flex-col gap-1"><span className="text-sm font-semibold">{q.title}</span><span className={`text-[10px] w-fit px-1.5 py-0.5 rounded-full ${getDiffColor(q.difficulty)}`}>{q.difficulty}</span></div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setOrderedQuestions([...orderedQuestions, q])}><Plus className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                    <div className="border rounded-xl bg-primary/5 p-4 border-primary/20 max-h-[400px] overflow-y-auto space-y-2">
                      {orderedQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-3 rounded-lg border flex items-center gap-3">
                          <span className="text-lg font-black text-slate-200">{idx + 1}</span>
                          <div className="flex-1 overflow-hidden"><p className="text-sm font-bold truncate">{q.title}</p></div>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveItem(orderedQuestions, setOrderedQuestions, idx, 'up')}><ArrowUp className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === orderedQuestions.length - 1} onClick={() => moveItem(orderedQuestions, setOrderedQuestions, idx, 'down')}><ArrowDown className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setOrderedQuestions(orderedQuestions.filter(x => x.id !== q.id))}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Riddles</CardTitle>
                      <p className="text-sm text-muted-foreground">Players solve these to unlock coding challenges.</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${orderedRiddles.length === orderedQuestions.length ? 'text-primary' : 'text-orange-500'}`}>{orderedRiddles.length}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search riddles..." className="pl-9" value={riddleSearchQuery} onChange={e => setRiddleSearchQuery(e.target.value)} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-xl bg-slate-50/50 p-4 max-h-[300px] overflow-y-auto space-y-2">
                      {filteredRiddles.map(r => (
                        <div key={r.id} className="group bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between hover:border-primary"><span className="text-sm line-clamp-1 flex-1 pr-2">{r.question}</span><Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setOrderedRiddles([...orderedRiddles, r])}><Plus className="h-4 w-4" /></Button></div>
                      ))}
                    </div>
                    <div className="border rounded-xl bg-primary/5 p-4 border-primary/20 max-h-[300px] overflow-y-auto space-y-2">
                      {orderedRiddles.map((r, idx) => (
                        <div key={r.id} className="bg-white p-3 rounded-lg border flex items-center gap-3"><span className="text-xs font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">Q{idx + 1}</span><p className="text-xs truncate flex-1">{r.question}</p><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setOrderedRiddles(orderedRiddles.filter(x => x.id !== r.id))}><X className="h-3.5 w-3.5" /></Button></div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}