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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import {
  type CreateCompetitionDialogProps,
  type EmailPayload
} from "../interfaces/CreateCompetitionTypes";
import type { Question } from "../interfaces/Question";
import { getQuestions } from "@/api/QuestionsAPI";
import { sendEmail } from "@/api/EmailAPI";

function localToUTCZ(dtLocal?: string) {
  if (!dtLocal) return undefined;
  const localDate = new Date(dtLocal);
  if (Number.isNaN(localDate.getTime())) {
    console.error("Invalid date string provided:", dtLocal);
    return undefined;
  }
  const utcISOString = localDate.toISOString();
  return utcISOString.replace(".000Z", "Z");
}

function oneMinuteFromNowISO() {
  return new Date(Date.now() + 60_000).toISOString().replace(".000Z", "Z");
}

export default function CreateCompetitionDialog({ open, onOpenChange }: Readonly<CreateCompetitionDialogProps>) {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    questionCooldownTime: "",
    riddleCooldownTime: "",
  });

  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    text: "",
    sendAtLocal: "",
    sendInOneMinute: false,
  });
  const [validationError, setValidationError] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const [riddleSearchQuery, setRiddleSearchQuery] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [selectedRiddles, setSelectedRiddles] = useState<number[]>([]);


  const fallbackQuestions = [
    { id: "1", title: "Two Sum", difficulty: "Easy" },
  ];


  const [questions, setQuestions] = useState<Question[]>(fallbackQuestions);


  useEffect(() => {
    let cancelled = false;

    const loadQuestions = async () => {
      try {
        const data = await getQuestions();

        if (!cancelled) {
          setQuestions(data);
        }
      } catch (err) {
        console.error("Failed to load questions, keeping fallbacks.", err);
        // We catch the error here so the app doesn't crash, 
        // keeping whatever fallbackQuestions you have in state.
      }
    };

    loadQuestions();

    return () => { cancelled = true; };
  }, []);

  // Hardcoded riddles data (unchanged)
  const riddles = [
    { id: 1, title: "Where's Waldo?" },
    { id: 2, title: "I speak without a mouth" },
    { id: 3, title: "The more you take, the more you leave behind" },
    { id: 4, title: "What can travel around the world while staying in a corner?" },
    { id: 5, title: "I have cities but no houses" },
    { id: 6, title: "What gets wetter the more it dries?" },
  ];

  const filteredQuestions = questions.filter((q) =>
    q.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRiddles = riddles.filter((r) =>
    r.title.toLowerCase().includes(riddleSearchQuery.toLowerCase())
  );

  const toggleQuestion = (id: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const toggleRiddle = (id: number) => {
    setSelectedRiddles((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const validateForm = (): boolean => {
    if (formData.name.trim() === '' || formData.date === '' || formData.startTime === '' || formData.endTime === '') {
      setValidationError("Incomplete general information.");
      return false;
    }

    const competitionDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const now = new Date();
    now.setSeconds(0, 0);
    if (competitionDateTime.getTime() <= now.getTime()) {
      setValidationError("The competition must be scheduled for a future date and time.");
      return false;
    }

    if (selectedQuestions.length === 0) {
      setValidationError("Please select at least one question.");
      return false;
    }
    if (selectedRiddles.length === 0) {
      setValidationError("Please select at least one riddle.");
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }

    // Handle competition creation
    console.log("Competition created:", formData);
    console.log("Selected questions:", selectedQuestions);
    console.log("Selected riddles:", selectedRiddles);

    // Handle email notification if recipients are provided
    if (emailData.to.trim()) {
      try {
        await sendEmail({
          to: emailData.to,
          subject: emailData.subject,
          text: emailData.text,
          sendInOneMinute: emailData.sendInOneMinute,
          sendAtLocal: emailData.sendAtLocal
        });
        console.log("Email processing initiated ✅");
      } catch (error) {
        // We log the error but allow the form to reset/close 
        // (mimicking your original "continue on error" flow)
        console.error("Failed to send email notification:", error);
      }
    }

    onOpenChange(false);
    // Reset form
    setFormData({
      name: "",
      date: "",
      startTime: "",
      endTime: "",
      questionCooldownTime: "",
      riddleCooldownTime: "",
    });
    setEmailData({
      to: "",
      subject: "",
      text: "",
      sendAtLocal: "",
      sendInOneMinute: false,
    });
    setSelectedQuestions([]);
    setSelectedRiddles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">
            Create New Competition
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new competition.
          </DialogDescription>
          {/* Validation Error Message */}
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
          </div>

          {/* Question Selection */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-primary">Question Selection</h3>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 text-primary hover:text-primary"
                onClick={() => console.log("Add new question")}
              >
                <IconPlus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="border rounded-lg max-h-[200px] overflow-y-auto">

              {filteredQuestions && filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedQuestions.includes(Number(question.id))}
                    onCheckedChange={() => toggleQuestion(Number(question.id))}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{question.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getDifficultyClasses(question.difficulty ?? "")}`}
                      >
                        {question.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cooldownTime">Cooldown Time Between Questions (seconds)</Label>
              <Input
                id="cooldownTime"
                type="number"
                min="0"
                value={formData.questionCooldownTime}
                onChange={(e) => setFormData({ ...formData, questionCooldownTime: e.target.value })}
                placeholder="Enter cooldown time"
              />
            </div>
          </div>

          {/* Riddle Selection */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-primary">Riddle Selection</h3>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search riddles..."
                  value={riddleSearchQuery}
                  onChange={(e) => setRiddleSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 text-primary hover:text-primary"
                onClick={() => console.log("Add new riddle")}
              >
                <IconPlus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              {filteredRiddles.map((riddle) => (
                <div
                  key={riddle.id}
                  className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedRiddles.includes(riddle.id)}
                    onCheckedChange={() => toggleRiddle(riddle.id)}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">{riddle.title}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="riddleCooldownTime">Cooldown Time Between Riddles (seconds)</Label>
              <Input
                id="riddleCooldownTime"
                type="number"
                min="0"
                value={formData.riddleCooldownTime}
                onChange={(e) => setFormData({ ...formData, riddleCooldownTime: e.target.value })}
                placeholder="Enter cooldown time"
              />
            </div>
          </div>

          {/* Email Notification */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-primary">Email Notification</h3>
            <p className="text-sm text-gray-500">Optionally send email notifications about this competition</p>

            <div className="grid gap-2">
              <Label htmlFor="emailTo">To (comma-separated)</Label>
              <Input
                id="emailTo"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                placeholder="alice@example.com, bob@example.com"
              />
            </div>

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
              <Label htmlFor="emailText">Message</Label>
              <Textarea
                id="emailText"
                rows={4}
                value={emailData.text}
                onChange={(e) => setEmailData({ ...emailData, text: e.target.value })}
                placeholder="Write your message..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="sendInOneMinute" className="text-sm font-medium">Send in 1 minute</Label>
                  <p className="text-xs text-gray-500">
                    Overrides custom schedule
                  </p>
                </div>
                <Switch
                  id="sendInOneMinute"
                  checked={emailData.sendInOneMinute}
                  onCheckedChange={(checked) => setEmailData({ ...emailData, sendInOneMinute: checked })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sendAtLocal">Schedule (local time)</Label>
                <Input
                  id="sendAtLocal"
                  type="datetime-local"
                  value={emailData.sendAtLocal}
                  onChange={(e) => setEmailData({ ...emailData, sendAtLocal: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
            Create Competition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDifficultyClasses(difficulty: string): string {
  const classMap: Record<string, string> = {
    "Easy": "bg-green-100 text-green-700",
    "Medium": "bg-yellow-100 text-yellow-700",
    "Hard": "bg-red-100 text-red-700",
  };
  return classMap[difficulty] || "bg-gray-100 text-gray-700";
}