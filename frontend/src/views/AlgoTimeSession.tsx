import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch";
import { AlertCircle,CalendarIcon} from "lucide-react"
import {
  type EmailPayload
} from "../components/interfaces/CreateCompetitionTypes";
import type { Question } from "../components/interfaces/Question";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }
}

export default function ManageAlgoTimePage() {
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    questionCooldownTime: "",
  });

  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    text: "",
    sendAtLocal: "",
    sendInOneMinute: false,
  });
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [month, setMonth] = useState<Date | undefined>(date)


  const errorRef = useRef<HTMLParagraphElement>(null);


  const fallbackQuestions = [
    { id: 1, title: "Two Sum", difficulty: "Easy" },
  ];


  const [questions, setQuestions] = useState(fallbackQuestions);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/questions/");
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Error occurred while fetching questions"); 
        if (!Array.isArray(body)) throw new Error("Fetched questions is not in the correct format");
        const normalized = body.map((q: Question, i: number) => ({
          id: typeof q.id === "string" ? Number(q.id) : (q.id ?? i + 1),
          title: q.title ?? `Question ${i + 1}`,
          difficulty: q.difficulty ? { easy: "Easy", medium: "Medium", hard: "Hard" }[q.difficulty.toLowerCase()] || "Unknown" : "Unknown"
        }));
        if (!cancelled) setQuestions(normalized);
      } catch {
        // keep fallbackQuestions
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredQuestions = questions.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleQuestion = (id: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const validateForm = (): boolean => {
    if (formData.date === '' || formData.startTime === '' || formData.endTime === '') {
      setValidationError("Incomplete general information.");
      return false;
    }

    const ATSessionDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const now = new Date();
    now.setSeconds(0, 0); 
    if (ATSessionDateTime.getTime() <= now.getTime()) {
        setValidationError("The session must be scheduled for a future date and time.");
        return false;
    }

    if (selectedQuestions.length === 0) {
      setValidationError("Please select at least one question.");
      return false;
    }
    if (selectedQuestions.length > 1) {
      setValidationError("You have reached the maximum number of questions.");
      return false;
    }

    setValidationError('');
    return true;
  };
  
  const handleReset = () => {
    setFormData({
      date: "",
      startTime: "",
      endTime: "",
      questionCooldownTime: "",
    });
    setEmailData({
      to: "",
      subject: "",
      text: "",
      sendAtLocal: "",
      sendInOneMinute: false,
    });
    setSelectedQuestions([]);
    setValidationError('');
  }

  const handleSubmit = async () => {

    if (!validateForm()) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      return; // Stop submission if validation fails
    }
  try{
    // Handle Session creation
    console.log("Session created:", formData);
    console.log("Selected questions:", selectedQuestions);

    // Handle email notification if recipients are provided
    if (emailData.to.trim()) {
      const toList = emailData.to.split(",").map(s => s.trim()).filter(Boolean);
      
      if (toList.length > 0) {
        const payload: EmailPayload = {
          to: toList,
          subject: emailData.subject,
          text: emailData.text,
        };

        const sendAt = emailData.sendInOneMinute
          ? oneMinuteFromNowISO()
          : localToUTCZ(emailData.sendAtLocal);
        if (sendAt) payload.sendAt = sendAt;

        try {
          const res = await fetch('http://127.0.0.1:8000/email/send', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const body = await res.json().catch(() => ({}));

          if (res.ok) {
            console.log(sendAt ? "Email scheduled ✅" : "Email sent ✅");
          } else {
            console.error("Email send failed:", body?.error || `HTTP ${res.status}`);
          }
        } catch (e: unknown) {
          const error = e as { message?: string };
          console.error("Network error:", error?.message ?? String(e));
        }
      }
    }
      // Navigate to main page 
      navigate("/app/dashboard"); 
      // Show success message
      toast.success("AlgoTime Session created successfully!");
      
      handleReset();

      }catch (error) {
        setValidationError('Failed to create session. Please try again.');
        setTimeout(() => {
          errorRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
      }
    
  };

  return (
        <div className="min-h-screen flex flex-col gap-4">
              {/* Header */}
              <div className="mb-2">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Create a New AlgoTime Session
                </h1>
                <p className="text-gray-600">
                  Fill in the details below to create a new Sesssion.
                </p>
              </div>

              <div ref={errorRef}>
                {validationError && (
                  <Alert className="shadow border-red-600"variant="destructive">
                    <AlertCircle/>
                      <AlertTitle >Warning!</AlertTitle>
                      <AlertDescription>
                      {validationError}
                      </AlertDescription>
                  </Alert>
            )}
            </div>
    
              {/* Form Content */}
              <div className="space-y-8">
                {/* General Information */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">General Information</h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4 ">
                    <div className="md:col-span-2">
                    </div>
                  
                    <div >
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </Label>
                      <div className="relative ">
                        <Input
                          type="text"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="date-picker"
                              variant="ghost"
                              className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
                            >
                              <CalendarIcon className="size-3.5" />
                              <span className="sr-only">Select date</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="end"
                            alignOffset={-8}
                            sideOffset={10}
                          >
                            <Calendar
                             mode="single"
                             selected={formData.date ? new Date(formData.date+ 'T00:00:00') : undefined}
                             captionLayout="dropdown"
                             month={month}
                             onMonthChange={setMonth}
                             onSelect={(selectedDate) => {
                               if (selectedDate) {
                                 setFormData({ ...formData, date: format(selectedDate, "yyyy-MM-dd") })
                               }
                               setOpen(false)
                             }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
    
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="time-picker" className="px-1">
                      Start Time
                      </Label>
                      <Input
                        type="time"
                        id="startTime-picker"
                        step="1"
                        value={formData.startTime||"12:00:00"}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      />
                    </div>
    
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="time-picker" className="px-1">
                      End Time
                      </Label>
                      <Input
                        type="time"
                        id="endTime-picker"
                        step="1"
                        value={formData.endTime||"12:00:00"}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      />
                    </div>
    
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Cooldown (minutes)
                      </Label>
                      <Input
                        type="number"
                        value={formData.questionCooldownTime}
                        onChange={(e) => setFormData({ ...formData, questionCooldownTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional"
                      />
                    </div>
    
                  </div>
                </div>
    
                {/* Select Questions */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Select Questions ({selectedQuestions.length} selected)
                  </h2>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {filteredQuestions.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedQuestions.includes(q.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Input
                              type="checkbox"
                              checked={selectedQuestions.includes(q.id)}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="font-medium text-gray-900">{q.title}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Email Notification */}
                <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                
                <AccordionTrigger className="text-primary text-xl font-semibold hover:text-primary/80">Email Notification</AccordionTrigger>
                <AccordionContent>
                <div className="grid gap-4">
                  
                  <p className="text-sm text-gray-500">Optionally send email notifications about this upcoming session</p>
                  
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
                      placeholder="Session announcement"
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
                </AccordionContent>
              </AccordionItem>
              </Accordion>

                      
    
                {/* Action Buttons */}
                <div className=" justify-end flex gap-2 pt-4 gap pb-4 ">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    className="cursor-pointer"
                  >
                    Reset
                  </Button>
                  <Button
                  type="submit"
                    onClick={handleSubmit}
                    className="cursor-pointer"
                  >
                    Create 
                  </Button>
                  
                </div>
              </div>
            </div>
      );
}

const getDifficultyColor = (difficulty: string) => {
    switch(difficulty.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };