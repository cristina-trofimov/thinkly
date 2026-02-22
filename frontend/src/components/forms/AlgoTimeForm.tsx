import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, MousePointer} from "lucide-react"
import type { Question } from "../../types/questions/Question.type";
import { logFrontend } from '../../api/LoggerAPI';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { format, addDays, addWeeks, addMonths } from "date-fns"
import { SessionQuestionSelector } from "@/components/algotime/SessionQuestionSelector"
import type { Session, CreateAlgotimeRequest, CreateAlgotimeSession } from "@/types/algoTime/AlgoTime.type";
import { getQuestions } from "@/api/QuestionsAPI";
import {createAlgotime} from "@/api/AlgotimeAPI"
import { GeneralInfoCard } from "@/components/createActivity/GeneralInfoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs"

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
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    questionCooldownTime: "",
    repeatType: "none", // none, daily, weekly, biweekly, monthly
    repeatEndDate: "",
  });

  const [generalData, setGeneralData] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: ""
  });
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [searchQueries, setSearchQueries] = useState<{ [key: number]: string }>({});
  const [sessionQuestions, setSessionQuestions] = useState<{ [key: number]: number[] }>({
    1: []
  });
  const [difficultyFilters, setDifficultyFilters] = useState<{ [key: number]: string | undefined }>({});
  const [sessionNames, setSessionNames] = useState<{ [key: number]: string }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleGeneralChange = (updates: Partial<typeof generalData>) => {
    setGeneralData(prev => ({
      ...prev,
      ...updates
    }));
  };
  const handleRepeatChange = (updates: {
    repeatType?: string;
    repeatEndDate?: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };
  const handleCooldownChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      questionCooldownTime: value
    }));
  };
 
  // Calculate repeat sessions
  const calculateRepeatSessions = (): Session[] => {
    if (!generalData.date || formData.repeatType === "none") {
      return [{ id: "1", sessionNumber: 1, date: generalData.date || formData.date }];
    }

    const sessions: Session[] = [];
    const startDate = new Date(generalData.date + 'T00:00:00');
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
  const [activeSession, setActiveSession] = useState<string>(
    `session-${repeatSessions[0]?.sessionNumber || 1}`
  )

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
          url: globalThis.location.href,
        });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError ? err.message : "Unknown error during question fetch.";

        // Log the error to the backend
        logFrontend({
          level: 'ERROR',
          message: `API Error: Failed to fetch questions. Reason: ${errorMessage}`,
          component: 'HomePage',
          url: globalThis.location.href,
          stack: isError ? err.stack : undefined, // Safely access stack
        });
      }
    }

    getAllQuestions()
  }, [])

  const isSessionComplete = (sessionNum: number) => {
    const hasQuestions = (sessionQuestions[sessionNum]?.length || 0) > 0;
    const hasName = !!(sessionNames[sessionNum]?.trim());
    return hasQuestions && hasName;
  };

  const validateForm = (): boolean => {
    if (generalData.date === '' || generalData.startTime === '' || generalData.endTime === '') {
      setValidationError("Incomplete general information.");
      return false;
    }

    if (formData.repeatType !== 'none' && formData.repeatEndDate === '') {
      setValidationError("Please provide an end date for repeat sessions.");
      return false;
    }


    if (generalData.name.trim() === '') {
      setValidationError("Please enter a session name.");
      return false;
    }

    const ATSessionDateTime = new Date(`${generalData.date}T${generalData.startTime}`);
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
    setSearchQueries({});
    setSessionQuestions({ 1: [] });
    setDifficultyFilters({});
    setValidationError('');
  }

  const getDateRangeString = () => {
    if (repeatSessions.length === 1) {
      return format(
        new Date(repeatSessions[0].date + 'T00:00:00'),
        'MMM d, yyyy'
      );
    }

    const firstDate = format(
      new Date(repeatSessions[0].date + 'T00:00:00'),
      'MMM d'
    );

    const lastDate = format(
      new Date(repeatSessions.at(-1)!.date + 'T00:00:00'),
      'MMM d, yyyy'
    );

    return `${firstDate} - ${lastDate}`;
  };

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
        name:
          sessionNames[session.sessionNumber] ||
          generalData.name ||
          "AlgoTime Session",
      
        date: session.date,
      
        startTime: generalData.startTime,
        endTime: generalData.endTime,
      
        selectedQuestions:
          sessionQuestions[session.sessionNumber] || []
      }));

      const payload: CreateAlgotimeRequest = {
        seriesName: `AlgoTime Session (${getDateRangeString()})`,
        questionCooldown: Number(formData.questionCooldownTime) || 300,
        sessions: sessions,
      };

      setIsSubmitting(true);

      await createAlgotime(payload);

      logFrontend({
        level: "INFO",
        message: "AlgoTime sessions created successfully",
        component: "AlgoTimeSessionForm",
        url: globalThis.location.href,
      });

      // Navigate to main page 
      navigate("/app/dashboard");
      // Show success message
      toast.success("AlgoTime Session created successfully!");

      handleReset();

    } catch (error: unknown) {
      setIsSubmitting(false);

      const isAxiosError = (err: unknown): err is { response?: { status?: number; data?: { detail?: string } } } => {
        return typeof err === 'object' && err !== null && 'response' in err;
      };

      // 409 handling
      if (isAxiosError(error) && error.response?.status === 409) {
        setValidationError(
          error.response?.data?.detail || 
          'A series with this name already exists. Please try again.'
        );

      } else {
      console.error('Session creation failed:', error);
      setValidationError('Failed to create session. Please try again.');
      toast.error("Failed to create session");
      }
      setTimeout(() => {
        errorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }

  };



  return (
    <div className="max-w-7xl mx-auto px-6 py-1 space-y-6">
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }} className="space-y-4"> 

      <div className="flex justify-between items-center mb-2">
          <div>
                <h2 className="text-2xl font-bold text-primary">
                  Create a New AlgoTime Session
                </h2>
                <p className="text-muted-foreground text-sm">Fill in the details below to create a new Session.</p>
          </div>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>

          </div>
        </div>
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

        {/* Form Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          <div className="lg:col-span-2 space-y-4 text-sm">
         <GeneralInfoCard
          data={generalData}
          errors={{}}
          onChange={handleGeneralChange}

          repeatData={{
            repeatType: formData.repeatType,
            repeatEndDate: formData.repeatEndDate
          }}
          onRepeatChange={handleRepeatChange}

          cooldown={formData.questionCooldownTime}
          onCooldownChange={handleCooldownChange}
        />

        </div>

          <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MousePointer className="h-5 w-5 text-primary" /> Select Questions for Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.repeatType !== "none" && formData.repeatEndDate && generalData.date ? (
                <Tabs
                  value={activeSession}
                  onValueChange={setActiveSession}
                  className="w-full"
                >
                <div className="flex h-[500px] gap-6">
                  {/* Tabs List on the left */}
                  <TabsList className="flex flex-col h-full w-48 shrink-0 justify-start overflow-y-auto rounded-none border-r border-gray-200 bg-transparent p-1 gap-1">
                    {repeatSessions.map((session) => (
                      <TabsTrigger
                      key={session.sessionNumber}
                      value={`session-${session.sessionNumber}`}
                      className={`w-full justify-start text-left px-3 py-2 text-sm truncate border-l-2 ${
                        isSessionComplete(session.sessionNumber)
                          ? "border-l-green-500 bg-green-500/10 text-green-700"
                          : "border-l-red-500 bg-red-500/10 text-red-700"
                      }`}
                    >
              <span className="truncate block w-full">
                {sessionNames[session.sessionNumber] || `Session ${session.sessionNumber}`}
              </span>
            </TabsTrigger>
            ))}
          </TabsList>

          {/* Tabs Content on the right */}
          <div className="flex-1 overflow-auto min-w-0">
            {repeatSessions.map((session) => (
              <TabsContent
                key={session.sessionNumber}
                value={`session-${session.sessionNumber}`}
                className="mt-0 p-2"
                forceMount  
                hidden={activeSession !== `session-${session.sessionNumber}`}
              >
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
                  sessionNames={sessionNames}
                  setSessionNames={setSessionNames}
                />
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
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
                sessionNames={sessionNames}
                setSessionNames={setSessionNames}
              />
            )
            }
          </CardContent>
        </Card>
          </div>
         
        </div>
      </form>
    </div>
  );
}