import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CalendarIcon } from "lucide-react"
import type { Question } from "../../types/questions/Question.type";
import { logFrontend } from '../../api/LoggerAPI';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { Popover,PopoverContent,PopoverTrigger,} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays, addWeeks, addMonths } from "date-fns"
import { Accordion,AccordionContent,AccordionItem,AccordionTrigger,} from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SessionQuestionSelector } from "@/components/algotime/SessionQuestionSelector"
import type { Session } from "@/types/algoTime/AlgoTime.type";
import { getQuestions } from "@/api/QuestionsAPI";
import { sendEmail } from "@/api/EmailAPI";
import {createAlgotime} from "@/api/AlgotimeAPI"
import { type CreateAlgotimeRequest, type CreateAlgotimeSession } from "@/types/algoTime/AlgoTime.type"

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'hard': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export const AlgoTimeSessionForm = () => {
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    questionCooldownTime: "",
    repeatType: "none", // none, daily, weekly, biweekly, monthly
    repeatEndDate: "",
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
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [searchQueries, setSearchQueries] = useState<{ [key: number]: string }>({});
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)
  const [monthStart, setMonthStart] = useState(new Date())
  const [monthEnd, setMonthEnd] = useState(new Date())
  const [sessionQuestions, setSessionQuestions] = useState<{ [key: number]: number[] }>({
    1: []
  });
  const [difficultyFilters, setDifficultyFilters] = useState<{ [key: number]: string | undefined }>({});
  const [seriesName, setSeriesName] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)


  // Calculate repeat sessions
  const calculateRepeatSessions = (): Session[] => {
    if (!formData.date || formData.repeatType === "none") {
      return [{ id: "1", sessionNumber: 1, date: formData.date }];
    }

    const sessions: Session[] = [];
    const startDate = new Date(formData.date + 'T00:00:00');
    const endDate = formData.repeatEndDate ? new Date(formData.repeatEndDate + 'T00:00:00') : null;

    let currentDate = startDate;
    let sessionNumber = 1;

    while (true) {
      sessions.push({
        id: sessionNumber.toString(),
        sessionNumber,
        date: format(currentDate, 'yyyy-MM-dd')
      });

      // Calculate next date based on repeat type
      switch (formData.repeatType) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
      }

      sessionNumber++;

      // Check if we've reached the end date or max sessions
      if (endDate && currentDate > endDate) break;
      if (sessionNumber > 52) break; // Safety limit
    }

    return sessions;
  };


  // Toggle question for specific session
  const toggleQuestionForSession = (sessionNum: number, questionId: number) => {
    setSessionQuestions(prev => {
      const currentQuestions = prev[sessionNum] || [];
      const isSelected = currentQuestions.includes(questionId);

      return {
        ...prev,
        [sessionNum]: isSelected
          ? currentQuestions.filter(id => id !== questionId)
          : [...currentQuestions, questionId]
      };
    });
  };

  const repeatSessions = calculateRepeatSessions();

  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const getAllQuestions = async () => {
      try {
        const data = await getQuestions();
        const transformed = data.map((q: Question) => ({
          ...q,
          // SessionQuestionSelector expects q.title, not q.questionTitle
          title: q.title,
          // normalize difficulty to lowercase
          difficulty: q.difficulty,
          // id might be string, convert to number if selector expects number
          id: q.id,
        }));
        setQuestions(transformed);

        logFrontend({
          level: 'DEBUG', // <--- Now using DEBUG level
          message: `Finished initial data fetch for questions successfully.`,
          component: 'HomePage',
          url: window.location.href,
        });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError ? err.message : "Unknown error during question fetch.";

        // Log the error to the backend
        logFrontend({
          level: 'ERROR',
          message: `API Error: Failed to fetch questions. Reason: ${errorMessage}`,
          component: 'HomePage',
          url: window.location.href,
          stack: isError ? err.stack : undefined, // Safely access stack
        });
      }
    }

    getAllQuestions()
  }, [])


  const validateForm = (): boolean => {
    if (formData.date === '' || formData.startTime === '' || formData.endTime === '') {
      setValidationError("Incomplete general information.");
      return false;
    }

    if (formData.repeatType !== 'none' && formData.repeatEndDate === '') {
      setValidationError("Please provide an end date for repeat sessions.");
      return false;
    }

    const ATSessionDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const now = new Date();
    now.setSeconds(0, 0);
    if (ATSessionDateTime.getTime() <= now.getTime()) {
      setValidationError("The session must be scheduled for a future date and time.");
      return false;
    }

    // Check that each session has at least one question
    const sessionsWithoutQuestions = repeatSessions.filter(
      session => !sessionQuestions[session.sessionNumber]?.length
    );

    if (sessionsWithoutQuestions.length > 0) {
      setValidationError(`Please select at least one question for session ${sessionsWithoutQuestions[0].sessionNumber}.`);
      return false;
    }

    // Check that no session has more than 6 question
    const sessionsWithTooMany = repeatSessions.filter(
      session => (sessionQuestions[session.sessionNumber]?.length || 0) > 6
    );

    if (sessionsWithTooMany.length > 0) {
      setValidationError(`Session ${sessionsWithTooMany[0].sessionNumber} has too many questions. Maximum is 6.`);
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
      repeatType: "none", // none, daily, weekly, biweekly, monthly
      repeatEndDate: ""
    });
    setEmailData({
      to: "",
      subject: "",
      text: "",
      sendAtLocal: "",
      sendInOneMinute: false,
    });
    setSelectedQuestions([]);
    setSearchQueries({});
    setSessionQuestions({ 1: [] });
    setDifficultyFilters({});
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
    try {
      const sessions: CreateAlgotimeSession[] = repeatSessions.map(session => ({
        name: `${format (new Date (session.date + "T00:00:00"), "MMM d, yyyy")} - Session ${session.sessionNumber}`,
        date: session.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        selectedQuestions: sessionQuestions[session.sessionNumber] || []
      }));

      const payload: CreateAlgotimeRequest = {
        seriesName: seriesName || "AlgoTime Session",
        questionCooldown: Number(formData.questionCooldownTime) || 300,
        sessions: sessions,
      };

      setIsSubmitting(true);

      await createAlgotime(payload);

      logFrontend({
        level: "INFO",
        message: "AlgoTime sessions created successfully",
        component: "AlgoTimeSessionForm",
        url: window.location.href,
      });

      // Handle email notification if recipients are provided
      if (emailData.to.trim()) {

        await sendEmail({
          to: emailData.to,
          subject: emailData.subject,
          text: emailData.text,
          sendInOneMinute: emailData.sendInOneMinute,
          sendAtLocal: emailData.sendAtLocal,
        });

        logFrontend({
          level: 'INFO',
          message: `Email processing initiated ✅`,
          component: 'AlgoTimeSessionForm',
          url: window.location.href,
        });

      }
      // Navigate to main page 
      navigate("/app/dashboard");
      // Show success message
      toast.success("AlgoTime Session created successfully!");

      handleReset();

    } catch (error) {
      console.error('Session creation failed:', error);
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
    <div className=" flex flex-col  ">

      <div ref={errorRef}>
        {validationError && (
          <Alert className="shadow border-destructive" variant="destructive">
            <AlertCircle />
            <AlertTitle >Warning!</AlertTitle>
            <AlertDescription>
              {validationError}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }} className="space-y-8">
        {/* Form Content */}
        <div className="space-y-8">
          {/* General Information */}
          <div>
            <h2 className="text-xl text-primary font-semibold mb-2">General Information</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-8">
              <div className="w-48">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.repeatType !== "none" ? "Start Date" : "Date"}
                </Label>
                <div className="relative ">
                  <Input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <Popover open={openStart} onOpenChange={setOpenStart}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant="ghost"
                        className=" absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
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
                        selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                        captionLayout="dropdown"
                        month={monthStart}
                        onMonthChange={setMonthStart}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                            setFormData({ ...formData, date: format(selectedDate, "yyyy-MM-dd") })
                          }
                          setOpenStart(false)
                        }}
                        classNames={{
                          day_button: "hover:bg-primary/50 hover:text-white",
                          day_selected: "bg-primary/70 text-white",
                          today: "ring-2 ring-primary  ring-offset-2 text-primary-foreground bg-primary rounded-md",
                          month_caption: "text-primary"
                        }}

                      />
                    </PopoverContent>
                  </Popover>
                </div>

              </div>
              <div className="w-48">
                <Label className="block text-sm font-medium text-gray-700 mb-2">Repeat</Label>
                <Select
                  value={formData.repeatType}
                  onValueChange={(value) => {
                    setFormData({ ...formData, repeatType: value });
                    if (value === 'none') {
                      setSessionQuestions({ 1: selectedQuestions });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Does not repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.repeatType !== "none" && (

              <div className="w-48 mt-8">
                <Label className="block text-sm font-medium text-gray-700 mb-2">End Repeat</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.repeatEndDate}
                    onChange={(e) => setFormData({ ...formData, repeatEndDate: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className=" border border-gray-300 rounded-lg focus:ring-2  focus:border-transparent"
                  />
                  <Popover open={openEnd} onOpenChange={setOpenEnd}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant="ghost"
                        className=" absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
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
                        selected={formData.repeatEndDate ? new Date(formData.repeatEndDate + 'T00:00:00') : undefined}
                        captionLayout="dropdown"
                        month={monthEnd}
                        onMonthChange={setMonthEnd}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                            setFormData({ ...formData, repeatEndDate: format(selectedDate, "yyyy-MM-dd") })
                          }
                          setOpenEnd(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>


            )}

            <div className="flex gap-2 mt-8">
              <div className="w-25">
                <Label htmlFor="time-picker" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </Label>
                <Input
                  type="time"
                  id="startTime-picker"
                  step="60"
                  value={formData.startTime || "12:00:00"}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>

              <div className="w-25">
                <Label htmlFor="time-picker" className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </Label>
                <Input
                  type="time"
                  id="endTime-picker"
                  step="60"
                  value={formData.endTime || "12:00:00"}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>
            <div className="w-48 mt-8">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Question Cooldown (seconds)
              </Label>
              <Input
                type="number"
                value={formData.questionCooldownTime}
                onChange={(e) => setFormData({ ...formData, questionCooldownTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="(Optional)"
              />
            </div>


          </div>

          <div>
            <h2 className="text-xl text-primary font-semibold text-gray-800 mb-4">
              Select Questions for Sessions
            </h2>

            {formData.repeatType !== "none" && formData.repeatEndDate && formData.date ? (
              repeatSessions.map((session) => (
                <SessionQuestionSelector
                  key={session.sessionNumber}
                  sessionNumber={session.sessionNumber}
                  sessionDate={session.date}
                  questions={questions}
                  sessionQuestions={sessionQuestions}
                  searchQueries={searchQueries}
                  setSearchQueries={setSearchQueries}
                  difficultyFilters={difficultyFilters}
                  setDifficultyFilters={setDifficultyFilters}
                  toggleQuestionForSession={toggleQuestionForSession}
                  getDifficultyColor={getDifficultyColor}
                />
              ))
            ) : (
              <SessionQuestionSelector
                sessionNumber={1}
                sessionDate={formData.date || ""}
                questions={questions}
                sessionQuestions={sessionQuestions}
                searchQueries={searchQueries}
                setSearchQueries={setSearchQueries}
                difficultyFilters={difficultyFilters}
                setDifficultyFilters={setDifficultyFilters}
                toggleQuestionForSession={toggleQuestionForSession}
                getDifficultyColor={getDifficultyColor}
              />
            )
            }
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
              type="button"
              variant="outline"
              onClick={handleReset}
              className="cursor-pointer"
            >
              Reset
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
            >
              Create
            </Button>

          </div>
        </div>
      </form>
    </div>
  );
}