import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { IconPlus, IconSearch, IconX, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { updateCompetition, getCompetitionById } from "@/api/CompetitionAPI";
import { logFrontend } from "@/api/LoggerAPI";
import { type Question } from "../../types/questions/Question.type";
import { type Riddle } from "../../types/riddle/Riddle.type";
import { getQuestions, getRiddles } from "@/api/QuestionsAPI";
import buildCompetitionEmail from "./BuildEmail";

interface EditCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: string;
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
        // Load all questions and riddles
        const [allQuestions, allRiddles, competitionData] = await Promise.all([
          getQuestions(),
          getRiddles(),
          getCompetitionById(competitionId)
        ]);

        console.log('Competition data received:', competitionData);
        console.log('All questions:', allQuestions);
        console.log('All riddles:', allRiddles);

        setQuestions(allQuestions);
        setRiddles(allRiddles);

        // Prefill form data
        setFormData({
          name: competitionData.competitionTitle || "",
          date: competitionData.date || "",
          startTime: competitionData.startTime || "",
          endTime: competitionData.endTime || "",
          location: competitionData.competitionLocation || "",
          questionCooldownTime: competitionData.questionCooldownTime?.toString() || "300",
          riddleCooldownTime: competitionData.riddleCooldownTime?.toString() || "60",
        });

        // Prefill selected questions (maintaining order)
        if (competitionData.selectedQuestions && competitionData.selectedQuestions.length > 0) {
          console.log('Selected question IDs:', competitionData.selectedQuestions);
          const orderedQs = competitionData.selectedQuestions
            .map((id: number) => allQuestions.find(q => q.id === id.toString()))
            .filter(Boolean) as Question[];
          console.log('Mapped questions:', orderedQs);
          setOrderedQuestions(orderedQs);
        }

        // Prefill selected riddles (maintaining order)
        if (competitionData.selectedRiddles && competitionData.selectedRiddles.length > 0) {
          console.log('Selected riddle IDs:', competitionData.selectedRiddles);
          const orderedRs = competitionData.selectedRiddles
            .map((id: number) => allRiddles.find(r => r.id === id.toString()))
            .filter(Boolean) as Riddle[];
          console.log('Mapped riddles:', orderedRs);
          setOrderedRiddles(orderedRs);
        }

        // Prefill email data if exists
        if (competitionData.emailNotification) {
          console.log('Email notification data:', competitionData.emailNotification);
          console.log('sendAtLocal value:', competitionData.emailNotification.sendAtLocal);
          console.log('sendAtLocal type:', typeof competitionData.emailNotification.sendAtLocal);

          setEmailEnabled(true);
          setEmailToAll(competitionData.emailNotification.to === "all participants");
          setEmailData({
            to: competitionData.emailNotification.to || "",
            subject: competitionData.emailNotification.subject || "",
            body: competitionData.emailNotification.body || "",
            sendAtLocal: competitionData.emailNotification.sendAtLocal || "",
            sendInOneMinute: competitionData.emailNotification.sendInOneMinute || false,
          });

          console.log('Email data state set to:', {
            to: competitionData.emailNotification.to || "",
            subject: competitionData.emailNotification.subject || "",
            body: competitionData.emailNotification.body || "",
            sendAtLocal: competitionData.emailNotification.sendAtLocal || "",
            sendInOneMinute: competitionData.emailNotification.sendInOneMinute || false,
          });
        } else {
          console.log('No email notification found in competition data');
          // No email notification exists
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
    // Reset the manual edit flag when any form field changes
    setEmailManuallyEdited(false);
  }, [
    formData.name,
    formData.date,
    formData.startTime,
    formData.endTime,
    formData.location,
  ]);
  // Auto-update email text
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

  const addQuestion = (question: Question) => {
    setOrderedQuestions([...orderedQuestions, question]);
  };

  const removeQuestion = (id: string) => {
    setOrderedQuestions(orderedQuestions.filter(q => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedQuestions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      setOrderedQuestions(newOrder);
    }
  };

  const addRiddle = (riddle: Riddle) => {
    setOrderedRiddles([...orderedRiddles, riddle]);
  };

  const removeRiddle = (id: string) => {
    setOrderedRiddles(orderedRiddles.filter(r => r.id !== id));
  };

  const moveRiddle = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedRiddles];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      setOrderedRiddles(newOrder);
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
      const payload = {
        id: competitionId,
        name: formData.name,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location || undefined,
        questionCooldownTime: parseInt(formData.questionCooldownTime) || 300,
        riddleCooldownTime: parseInt(formData.riddleCooldownTime) || 60,
        selectedQuestions: orderedQuestions.map(q => parseInt(q.id)),
        selectedRiddles: orderedRiddles.map(r => parseInt(r.id)),
        emailEnabled,
        emailNotification: emailEnabled ? {
          to: emailToAll ? "all participants" : emailData.to.trim(),
          subject: emailData.subject,
          body: emailData.body,
          sendInOneMinute: emailData.sendInOneMinute,
          sendAtLocal: emailData.sendAtLocal || undefined,
        } : undefined,
      };

      console.log('Submitting update payload:', payload);

      await updateCompetition(payload);

      console.log("Competition updated successfully ✅");

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

  const getDifficultyClasses = (difficulty: string): string => {
    const classMap: Record<string, string> = {
      "Easy": "bg-green-100 text-green-700",
      "Medium": "bg-yellow-100 text-yellow-700",
      "Hard": "bg-red-100 text-red-700",
    };
    return classMap[difficulty] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">
            Edit Competition
          </DialogTitle>
          <DialogDescription>
            Update the competition details below.
          </DialogDescription>
          {validationError && (
            <p className="text-red-500 text-sm font-medium border border-red-300 p-2 rounded-md bg-red-50">
              ⚠️ {validationError}
            </p>
          )}
        </DialogHeader>
        <div className="grid gap-6 py-4 overflow-y-auto max-h-[60vh] pr-2">
          {/* General Information */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-primary">General Information</h3>
            <div className="grid gap-2">
              <Label htmlFor="name">Competition Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter competition name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter competition location"
              />
            </div>
          </div>

          {/* Question Selection */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Question Selection & Order</h3>
              <span className="text-xs text-gray-500">{orderedQuestions.length} selected</span>
            </div>

            <div className="relative">
              <IconSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
              <Input
                placeholder="Search questions to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg max-h-[180px] overflow-y-auto bg-white">
              <div className="p-2 bg-gray-50 border-b sticky top-0">
                <span className="text-xs font-medium text-gray-600">Available Questions</span>
              </div>
              {filteredQuestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {searchQuery ? "No matching questions" : "All questions selected"}
                </p>
              ) : (
                filteredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => addQuestion(question)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{question.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyClasses(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                    </div>
                    <IconPlus className="h-4 w-4 text-primary" />
                  </div>
                ))
              )}
            </div>

            <div className="border rounded-lg p-3 bg-gray-50">
              <Label className="text-xs font-medium text-gray-600 mb-2 block">Selected Questions (in order)</Label>
              {orderedQuestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No questions selected yet</p>
              ) : (
                <div className="space-y-2">
                  {orderedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center gap-2 p-2 bg-white rounded border"
                    >
                      <span className="text-sm font-bold text-primary w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{question.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyClasses(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 p-0"
                        >
                          <IconArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === orderedQuestions.length - 1}
                          className="h-7 w-7 p-0"
                        >
                          <IconArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <IconX className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cooldownTime">Cooldown Time Between Questions (seconds)</Label>
              <Input
                id="cooldownTime"
                type="number"
                min="0"
                value={formData.questionCooldownTime}
                onChange={(e) => setFormData({ ...formData, questionCooldownTime: e.target.value })}
                placeholder="Enter cooldown time (default: 300)"
              />
            </div>
          </div>

          {/* Riddle Selection */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Riddle Selection & Order</h3>
              <span className="text-xs text-gray-500">{orderedRiddles.length} selected</span>
            </div>
            <p className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
              ℹ️ One riddle will be shown before each question. You must select the same number of riddles as questions.
            </p>

            <div className="relative">
              <IconSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
              <Input
                placeholder="Search riddles to add..."
                value={riddleSearchQuery}
                onChange={(e) => setRiddleSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg max-h-[180px] overflow-y-auto bg-white">
              <div className="p-2 bg-gray-50 border-b sticky top-0">
                <span className="text-xs font-medium text-gray-600">Available Riddles</span>
              </div>
              {filteredRiddles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {riddleSearchQuery ? "No matching riddles" : "All riddles selected"}
                </p>
              ) : (
                filteredRiddles.map((riddle) => (
                  <div
                    key={riddle.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => addRiddle(riddle)}
                  >
                    <span className="font-medium text-sm">{riddle.question}</span>
                    <IconPlus className="h-4 w-4 text-primary" />
                  </div>
                ))
              )}
            </div>

            <div className="border rounded-lg p-3 bg-gray-50">
              <Label className="text-xs font-medium text-gray-600 mb-2 block">Selected Riddles (in order)</Label>
              {orderedRiddles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No riddles selected yet</p>
              ) : (
                <div className="space-y-2">
                  {orderedRiddles.map((riddle, index) => (
                    <div
                      key={riddle.id}
                      className="flex items-center gap-2 p-2 bg-white rounded border"
                    >
                      <span className="text-sm font-bold text-primary w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <span className="font-medium text-sm">{riddle.question}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveRiddle(index, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 p-0"
                        >
                          <IconArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveRiddle(index, 'down')}
                          disabled={index === orderedRiddles.length - 1}
                          className="h-7 w-7 p-0"
                        >
                          <IconArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRiddle(riddle.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <IconX className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="riddleCooldownTime">Cooldown Time Between Riddles (seconds)</Label>
              <Input
                id="riddleCooldownTime"
                type="number"
                min="0"
                value={formData.riddleCooldownTime}
                onChange={(e) => setFormData({ ...formData, riddleCooldownTime: e.target.value })}
                placeholder="Enter cooldown time (default: 60)"
              />
            </div>
          </div>

          {/* Email Notification */}
          <div className="flex items-center justify-between rounded-md border p-3 mb-2">
            <div className="space-y-0.5">
              <Label htmlFor="enableEmail" className="text-sm font-medium">Enable Email Notifications</Label>
              <p className="text-xs text-gray-500">Toggle to enable or disable email notifications</p>
            </div>
            <Switch
              id="enableEmail"
              checked={emailEnabled}
              onCheckedChange={(checked) => setEmailEnabled(checked)}
            />
          </div>
          {emailEnabled && (
            <div className="grid gap-4">
              <h3 className="text-sm font-semibold text-primary">Email Notification</h3>
              <p className="text-sm text-gray-500">Email reminders will be sent 24 hours before and 5 minutes before the competition.</p>

              <div className="flex items-center justify-between rounded-md border p-3 mb-2">
                <div className="space-y-0.5">
                  <Label htmlFor="emailToAll" className="text-sm font-medium">Send to all participants</Label>
                  <p className="text-xs text-gray-500">
                    If enabled, the email will automatically go to all registered participants
                  </p>
                </div>
                <Switch
                  id="emailToAll"
                  checked={emailToAll}
                  onCheckedChange={(checked) => setEmailToAll(checked)}
                />
              </div>

              {!emailToAll && (
                <div className="grid gap-2">
                  <Label htmlFor="emailTo">To (comma-separated)</Label>
                  <Input
                    id="emailTo"
                    value={emailData.to}
                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                    placeholder="alice@example.com, bob@example.com"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="emailSubject">Subject</Label>
                <Input
                  id="emailSubject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Competition announcement"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emailText">Email Message (Edit if needed)</Label>
                <Textarea
                  id="emailText"
                  rows={5}
                  value={emailData.body}
                  onChange={(e) => {
                    setEmailManuallyEdited(true);
                    setEmailData({ ...emailData, body: e.target.value });
                  }}
                  placeholder="Message that will be sent in reminders"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="sendInOneMinute" className="text-sm font-medium">Send test in 1 minute</Label>
                    <p className="text-xs text-gray-500">
                      For testing purposes
                    </p>
                  </div>
                  <Switch
                    id="sendInOneMinute"
                    checked={emailData.sendInOneMinute}
                    onCheckedChange={(checked) => setEmailData({ ...emailData, sendInOneMinute: checked })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sendAtLocal">Additional custom reminder</Label>
                  <Input
                    id="sendAtLocal"
                    type="datetime-local"
                    value={emailData.sendAtLocal}
                    onChange={(e) => setEmailData({ ...emailData, sendAtLocal: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
