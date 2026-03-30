import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import CodeDescArea from "../components/codingPage/CodeDescArea";
import {
  Play, RotateCcw, Maximize2, ChevronDown,
  Minimize2, ChevronUp, CloudUpload, Undo
} from "lucide-react";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Panel, type ImperativePanelGroupHandle, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import MonacoEditor from "@monaco-editor/react";
import { submitToJudge0 } from '@/api/Judge0API';
import { useLocation } from 'react-router-dom';
import type { Question } from '@/types/questions/QuestionPagination.type';
import Loader from '../components/helpers/Loader';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';
import type { Competition } from '@/types/competition/Competition.type';
import { logFrontend } from '@/api/LoggerAPI';
import { useCodingHooks } from '@/components/helpers/CodingHooks';
import { putUserInstance } from '@/api/UserQuestionInstanceAPI';
import type { Judge0Response } from '@/types/questions/Judge0Response';
import { submitAttempt } from '@/api/SubmitCodeAPI';
import ConfirmCodeReset from '@/components/helpers/ConfirmCodeReset';
import { useUser } from '@/context/UserContext';
import type { SubmissionType } from '@/types/submissions/SubmissionType.type'
import ConsoleOutput from '@/components/codingPage/ConsoleOutput';
import type { AlgoTimeSession } from '@/types/algoTime/AlgoTime.type';
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAllSubmissions } from '@/api/SubmissionAPI';
import { useCountdown } from '@/hooks/useCountdown'


const CodingView = () => {
  const location = useLocation()
  const comp: Competition = location?.state?.comp
  const algo: AlgoTimeSession = location?.state?.algo_sess
  const question: Question = location?.state?.problem

  const {
    startTime, mostRecentSub, setMostRecentSub,
    userQuestionInstance, setUserQuestionInstance,
    activeQuestion, setActiveQuestion,
    activeQuestionInstance, setActiveQuestionInstance,
    activeDisplayQuestionName, setActiveDisplayQuestionName,
    questions, questionsInstances, languages, prevLangRef,
    selectedLang, setSelectedLang, event, testcases,
    loadingMsg, setLoadingMsg, isLoading, setIsLoading,
    allSubmissions, setAllSubmissions, allLanguages
  } = useCodingHooks(question, comp, algo)

  const codeDescAreaContainerRef = useRef<HTMLDivElement>(null)

  const {
    trackLanguageChanged,
    trackCodeReset,
    trackCodeRun,
    trackCodeSubmitted,
  } = useAnalytics()

  const { user } = useUser();

  const [theme, setTheme] = useState<string>(
    localStorage.getItem("theme") === "dark" ? "vs-dark" : "vs"
  )

  const [logs, setLogs] = useState<Judge0Response[]>([])
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [latestSubmissionResult, setLatestSubmissionResult] = useState<SubmissionType | null>(null)
  const hasSubmittedRef = useRef(false);
  const remainingMs = useCountdown(event?.event_end_date)
  const isExpired = remainingMs === 0



  useEffect(() => {
    const handleThemeSync = () => {
      setTheme(localStorage.getItem("theme") === "dark" ? "vs-dark" : "vs")
    }

    globalThis.addEventListener("storage", handleThemeSync)      // other tabs
    globalThis.addEventListener("storage_sync", handleThemeSync) // same tab (NavUser)

    return () => {
      globalThis.removeEventListener("storage", handleThemeSync)
      globalThis.removeEventListener("storage_sync", handleThemeSync)
    }
  }, [])

  // Auto-select the first language that has starter content when the question changes
  useEffect(() => {
    if (!activeQuestion || !languages?.length) return

    const langWithPreset = activeQuestion.language_specific_properties.find(
      (p) => p.template_code || p.preset_functions || p.preset_classes || p.imports || p.main_function
    )
    if (!langWithPreset) return

    const matchedLang = languages.find(
      (l) => l.display_name === langWithPreset.language_display_name
    )
    if (matchedLang) {
      setSelectedLang(matchedLang)
      prevLangRef.current = matchedLang
    }
  }, [activeQuestion?.question_id, languages]) // eslint-disable-line react-hooks/exhaustive-deps


  const formattedTime = (() => {
    if (remainingMs === null) return null          // no event / no timer
    const totalSeconds = Math.floor(remainingMs / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`
  })()

  // Called by CodeDescArea when the user solves the riddle.
  // Runs in CodingView so it updates the real userQuestionInstance state that
  // flows back down as a prop — fixing the "riddle stays stuck" bug.
  const handleRiddleSolved = async () => {
    if (!userQuestionInstance) return
    try {
      const updated = { ...userQuestionInstance, riddle_complete: true }
      const resp = await putUserInstance(updated)
      setUserQuestionInstance(resp)
    } catch (error) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when marking riddle as complete. Reason: ${error}`,
        component: "CodingView",
        url: globalThis.location.href,
        stack: (error as Error).stack,
      })
    }
  }

  const submitCode = async () => {
    if (activeQuestionInstance?.riddle_id && !userQuestionInstance?.riddle_complete) {
      toast.warning('Please answer the riddle first...')
      return
    }

    let submit = true

    if (event && mostRecentSub?.submitted_on) {
      const nextSubTime = new Date(mostRecentSub.submitted_on).getTime() + (event.question_cooldown * 1000)

      if (Date.now() < new Date(nextSubTime).getTime()) {
        const remainingMs = nextSubTime - Date.now()
        const totalSeconds = Math.ceil(remainingMs / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60

        const formatted = minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`

        toast.warning(`You're submitting too fast.\nTry again in ${formatted}`)
        submit = false
        return
      }
    }

    if (submit) {
      // Drive the left-panel Result tab instead of a full-page loader
      setSubmissionState('loading')

      try {
        if (userQuestionInstance) {
          userQuestionInstance.attempts = userQuestionInstance.attempts
            ? userQuestionInstance.attempts + 1
            : 1

          userQuestionInstance.lapse_time = userQuestionInstance.lapse_time
            ? userQuestionInstance.attempts + Date.now() - startTime!.getTime()
            : Date.now() - startTime!.getTime()
        }

        const codeToSubmit = composedBoilerplateBefore + '\n\n' + code + '\n\n' + composedBoilerplateAfter

        const {
          codeRunResponse,
          submissionResponse,
          mostRecentSubResponse
        } = await submitAttempt(
          activeQuestion, activeQuestionInstance,
          userQuestionInstance, event,
          codeToSubmit, code, selectedLang?.lang_judge_id, user?.id ?? 0, !!algo)

        hasSubmittedRef.current = true;

        setLatestSubmissionResult(submissionResponse)
        await getAllSubmissions(userQuestionInstance?.user_question_instance_id)
          .then((response) => {
            setAllSubmissions(response)
          })

        setLatestSubmissionResult(submissionResponse)
        setLogs(prev => [...prev, codeRunResponse.judge0Response])
        setMostRecentSub(mostRecentSubResponse)

        trackCodeSubmitted(
          activeQuestion!.question_id,
          selectedLang!,
        )
      } catch (err) {
        toast.error("Error when submitting the code.")
        setSubmissionState('idle')
        logFrontend({
          level: "ERROR",
          message: `An error occurred when submitting code. Reason: ${err}`,
          component: "CodingView",
          url: globalThis.location.href,
          stack: (err as Error).stack,
        });
      } finally {
        setSubmissionState('done')
      }
      // }
    }
  }

  const runCode = async () => {
    if (activeQuestionInstance?.riddle_id && !userQuestionInstance?.riddle_complete) {
      toast.warning('Please answer the riddle first...')
      return
    }
    if (!code.trim()) {
      toast.warning('You need to code something first...')
      return
    }

    try {
      setIsLoading(true)
      setLoadingMsg("Running")

      const codeToRun = composedBoilerplateBefore + '\n\n' + code + '\n\n' + composedBoilerplateAfter
      const { judge0Response } = await submitToJudge0(activeQuestionInstance?.question_instance_id, activeQuestion?.question_id,
        codeToRun, selectedLang?.lang_judge_id, user?.id ?? 0)

      setLogs(prev => [...prev, judge0Response])

      // Capture run result — status comes directly from Judge0 response
      trackCodeRun(
        activeQuestion?.question_id,
        selectedLang!,
        judge0Response.status.description,
        judge0Response.status.description === "Accepted", //passed
        judge0Response.time ?? undefined
      )
    } catch (err) {
      toast.error("Error when running the code.")
      logFrontend({
        level: "ERROR",
        message: `An error occurred when running code. Reason: ${err}`,
        component: "CodingView",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      });
    } finally {
      setIsLoading(false)
      setLoadingMsg("")
    }
  }

  // Keep a ref to the previous language so we can log "from → to" on change
  // Per-language code buffers — key: `${questionId}_${lang}`, value: user's typed code
  const codeBuffersRef = useRef<Map<string, string>>(new Map())

  // Look up the DB-stored properties for the currently selected language
  const activeLangProps = useMemo(
    () => activeQuestion?.language_specific_properties.find(
      (p) => p.language_display_name === selectedLang?.display_name
    ) ?? null,
    [activeQuestion, selectedLang]
  )

  // The user only sees template_code when entering a question.
  // All other fields (imports, preset_classes, preset_functions, main_function)
  // are composed separately and injected at submission/run time — not shown in the editor.
  const commentChar = selectedLang?.monaco_id === 'python' ? '#' : '//'
  const fallbackComment = `${commentChar} Write your solution here.`

  const presetCode = activeLangProps?.template_code || fallbackComment

  // Full code sent to Judge0: hidden boilerplate wrapped around the user's visible code
  const composedBoilerplateBefore = [
    activeLangProps?.imports,
    activeLangProps?.preset_classes,
    activeLangProps?.preset_functions
  ]
    .filter((section): section is string => Boolean(section?.trim()))
    .join('\n\n')

  const composedBoilerplateAfter = [
    activeLangProps?.main_function
  ]
    .filter((section): section is string => Boolean(section?.trim()))
    .join('\n\n')

  const [code, setCode] = useState<string>('')

  // Warn before refresh/close if code has been modified
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isUnmodified =
        hasSubmittedRef.current ||
        code.trim() === presetCode.trim() ||
        code.trim() === '';
      if (isUnmodified) return;
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [code, presetCode]);

  // Restore buffer or fall back to presetCode on language/question change
  useEffect(() => {
    const saved = codeBuffersRef.current.get(`${activeQuestion?.question_id}_${selectedLang?.monaco_id}`)
    setCode(saved ?? presetCode)
  }, [selectedLang, activeQuestion?.question_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [clearingCode, setClearingCode] = useState<boolean>(false)
  const [confirmClearingCode, setConfirmClearingCode] = useState<boolean>(false)

  useEffect(() => {
    if (!confirmClearingCode) return
    trackCodeReset(activeQuestion!.question_id, selectedLang!)
    // Clear buffer so the reset sticks if the user switches away and back
    codeBuffersRef.current.delete(`${activeQuestion?.question_id}_${selectedLang?.monaco_id}`)
    setConfirmClearingCode(false)
    setCode(presetCode)
  }, [confirmClearingCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuestionChange = async (q: Question) => {
    setActiveQuestion(q)
    const idx = questions.findIndex(qi => qi.question_id === q.question_id)

    if (idx === -1) return

    if (startTime && userQuestionInstance) {
      userQuestionInstance.lapse_time = Date.now() - startTime.getTime()
    }

    try {
      await putUserInstance(userQuestionInstance)
        .then((resp) => setUserQuestionInstance(resp))
    } catch (error) {
      logFrontend({
        level: "ERROR",
        message: `An error occurred when updating user question instance. Reason: ${error}`,
        component: "CodingView",
        url: globalThis.location.href,
        stack: (error as Error).stack,
      })
    }

    setActiveQuestionInstance(questionsInstances[idx])
    setActiveDisplayQuestionName(`Question ${idx + 1}`)
  }

  const [fullCode, setFullCode] = useState(false)
  const [fullOutput, setFullOutput] = useState(false)
  const [closeCode, setCloseCode] = useState(false)
  const [closeOutput, setCloseOutput] = useState(false)

  const mainPanelGroup = React.useRef<ImperativePanelGroupHandle>(null)
  const codePanelGroup = React.useRef<ImperativePanelGroupHandle>(null)

  // Replace just the formattedTime display span with this component:

  const CompetitionTimer = ({ remainingMs }: { remainingMs: number | null }) => {
    if (remainingMs === null) return null

    const isExpired = remainingMs === 0
    const isWarning = remainingMs < 5 * 60 * 1000
    const isUrgent = remainingMs < 60 * 1000

    const totalSeconds = Math.floor(remainingMs / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const display = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`

    return (
      <div className={`
      flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium tabular-nums
      transition-colors duration-500
      ${isExpired || isUrgent
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : isWarning
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            : 'bg-muted border-border text-muted-foreground'
        }
    `}>
        <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-destructive' :
          isUrgent ? 'bg-destructive animate-pulse' :
            isWarning ? 'bg-amber-500 animate-pulse' :
              'bg-emerald-500'
          }`} />
        {isExpired ? "Time's up" : display}
      </div>
    )
  }

  useLayoutEffect(() => {
    let mainPanelSize: number[], codePanelSize: number[]

    if (fullCode) {
      mainPanelSize = [0, 100]
      codePanelSize = [100, 0]
    } else if (fullOutput) {
      mainPanelSize = [0, 100]
      codePanelSize = [0, 100]
    } else if (closeCode && !closeOutput) {
      mainPanelSize = [50, 50]
      codePanelSize = [10, 90]
    } else if (closeOutput && !closeCode) {
      mainPanelSize = [50, 50]
      codePanelSize = [90, 10]
    } else {
      mainPanelSize = [50, 50]
      codePanelSize = [65, 35]
    }

    mainPanelGroup.current?.setLayout(mainPanelSize)
    codePanelGroup.current?.setLayout(codePanelSize)
  }, [fullCode, fullOutput, closeCode, closeOutput])

  if (isLoading) {
    return (
      <div className="px-2 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)] flex flex-col gap-2">
        {/* Submit button row */}
        <div className="flex justify-center mb-2">
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {/* Main panels */}
        <div className="flex gap-2 flex-1">
          {/* Description panel */}
          <div className="flex-1 rounded-md border p-4 flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full rounded-md mt-4" />
          </div>
          {/* Code + output panels */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Code panel */}
            <div className="flex-[65] rounded-md border flex flex-col">
              <div className="h-10 bg-muted border-b px-4 flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-7 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="h-10 border-b px-2 flex items-center">
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
              <Skeleton className="flex-1 h-64 rounded-none" />
            </div>
            {/* Output panel */}
            <div className="flex-[35] rounded-md border flex flex-col">
              <div className="h-10 bg-muted border-b px-4 flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <div className="flex gap-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-7 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="p-2.5 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sandbox" key="sandbox"
      className='flex flex-col px-2 h-162.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'
    >
      {/* Loading modal */}
      <Loader isOpen={isLoading} msg={loadingMsg} />
      <ConfirmCodeReset isOpen={clearingCode} setClose={() => setClearingCode(false)}
        setReset={() => setConfirmClearingCode(true)} setNoReset={() => setConfirmClearingCode(false)}
      />
      <div className='sticky top-0 z-10 bg-background'>
        <div className='w-full h-10 mb-2 flex relative shrink-0 items-center'>
          <div className='absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5'>
            <Button onClick={submitCode} data-testid="submit-btn" disabled={isExpired}>
              <CloudUpload size={16} />Submit
            </Button>
            <CompetitionTimer remainingMs={remainingMs} />
          </div>
          {questionsInstances.length > 1 && (
            <div className='absolute right-0'>
              <DropdownMenu data-testid='questions-dropdown'>
                <DropdownMenuTrigger
                  data-testid='questions-btn'
                  className="h-9 bg-background text-muted-foreground text-base font-bold
                    flex items-center gap-2 rounded-md p-2
                    hover:bg-primary/20 focus:bg-primary/55"
                >
                  {activeDisplayQuestionName}
                  <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='z-999' asChild>
                  <div data-testid='questions-menu'
                    className="z-10 text-sm bg-muted w-26 border rounded-lg"
                  >
                    {questions.map((q, idx) => (
                      <DropdownMenuItem data-testid={`questionItem-${q.question_name}`} key={q.question_name}
                        className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
                        onSelect={() => handleQuestionChange(q)}
                      >
                        {`Question ${idx + 1}`}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      <PanelGroup ref={mainPanelGroup} direction="horizontal" data-testid="panel-group"
        className='flex-1' >
        {/* Description panel */}
        <Panel data-testid="resizable-panel" key="desc-area"
          defaultSize={50} minSize={0}
          className='mr-0.75 rounded-md border'
        >
          <CodeDescArea
            question={activeQuestion} question_instance={activeQuestionInstance}
            uqi={userQuestionInstance} testcases={testcases}
            eventId={event?.event_id ?? (algo ? 0 : undefined)}
            eventName={event?.event_name ?? (algo ? "AlgoTime Leaderboard" : undefined)}
            isCompetitionEvent={!!comp}
            currentUserId={user?.id}
            submissionState={submissionState}
            latestSubmissionResult={latestSubmissionResult}
            submissions={allSubmissions}
            allLanguages={allLanguages}
            onRiddleSolved={handleRiddleSolved}
            ref={codeDescAreaContainerRef}
          />
        </Panel>

        <PanelResizeHandle data-testid="resizable-handle"
          className="w-[0.35px] mx-[1.5px] border-none"
          style={{ background: "transparent" }}
        />

        {/* Second panel */}
        <Panel defaultSize={50} data-testid="resizable-panel">
          <PanelGroup direction="vertical" ref={codePanelGroup} data-testid="panel-group">
            {/* Coding area panel */}
            <Panel defaultSize={65} data-testid="resizable-panel"
              className="ml-0.75 mb-1 rounded-md border"
            >
              <div data-testid="coding-area">
                <div data-testid="coding-btns"
                  className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
    border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                >
                  <span className="text-lg font-medium">Code</span>
                  <div className={`grid ${mostRecentSub ? 'grid-cols-5' : 'grid-cols-4'} gap-1`}>
                    <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25"
                      onClick={runCode} data-testid="play-btn"
                    >
                      <Play size={24} color="green" strokeWidth={2.5} className='hover:fill-green-400 fill-transparent' />
                    </Button>

                    {/* Most recent sub — only shown when available */}
                    {mostRecentSub && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button data-testid='most-recent-sub-btn'
                              onClick={() => { setCode(mostRecentSub?.code || presetCode) }}
                              className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                              <Undo size={22} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Go back to the most recently submitted code
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <Button className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25"
                      onClick={() => {
                        if (code.trim() === presetCode.trim()) {
                          setConfirmClearingCode(true)
                        } else {
                          setClearingCode(true)
                        }
                      }}
                    >
                      <RotateCcw size={22} strokeWidth={2} />
                    </Button>
                    <Button data-testid='code-area-fullscreen' onClick={() => { setFullCode(!fullCode) }}
                      className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                      {fullCode ? <Minimize2 data-testid='code-area-min-icon' size={22} /> : <Maximize2 data-testid='code-area-max-icon' size={22} />}
                    </Button>
                    <Button data-testid='code-area-collapse' onClick={() => { setCloseCode(!closeCode) }}
                      className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                      {closeCode ? <ChevronDown data-testid='code-area-down-icon' size={22} /> : <ChevronUp data-testid='code-area-up-icon' size={22} />}
                    </Button>
                  </div>
                </div>
                <div className="w-full rounded-none h-10 border-b border-border/75 dark:border-border/50 py-1.5 px-2">
                  <DropdownMenu data-testid='language-dropdown'>
                    <DropdownMenuTrigger>
                      <div data-testid='language-btn'
                        className="bg-background text-muted-foreground text-base font-bold h-7
                          flex items-center gap-2 rounded-md p-2
                          hover:bg-primary/20 focus:bg-primary/55"
                      >
                        {selectedLang?.display_name}
                        <ChevronDown />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='z-999' asChild>
                      <div data-testid='language-menu'
                        className="z-10 text-sm bg-muted text-foreground w-26 border rounded-lg"
                      >
                        {languages?.map((lang) => (
                          <DropdownMenuItem data-testid={`languageItem-${lang.monaco_id}`} key={lang.monaco_id}
                            className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
                            onSelect={() => {
                              // Save current code to buffer before switching
                              codeBuffersRef.current.set(`${activeQuestion?.question_id}_${selectedLang?.monaco_id}`, code)
                              if (prevLangRef.current) {
                                trackLanguageChanged(activeQuestion?.question_id, prevLangRef.current, lang)
                              }
                              prevLangRef.current = lang
                              setSelectedLang(lang)
                              toast.info("Code saved in this session — refreshing the page will lose your changes.")
                            }}
                          >
                            {lang.display_name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <MonacoEditor
                key={selectedLang?.monaco_id}
                language={selectedLang?.monaco_id}
                value={code}
                theme={theme}
                onChange={(value) => { setCode(value ?? presetCode) }}
                options={{
                  fontSize: 14,
                  automaticLayout: true,
                }}
              />
            </Panel>

            <PanelResizeHandle data-testid="resizable-handle"
              className='my-[0.5px] border-none h-[0.5px]'
              style={{ background: "transparent" }}
            />
            {/* Output panel */}
            <Panel data-testid="resizable-handle" defaultSize={35}
              className="ml-0.75 mt-1 rounded-md border"
            >
              <div data-testid="output-area"
                className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                  border-b border-border/75 dark:border-border/50 py-1.5 px-4"
              >
                <span className="text-lg font-medium">Output</span>
                <div data-testid="output-btns"
                  className="flex items-center gap-1">

                  <Button data-testid='output-area-fullscreen' onClick={() => { setFullOutput(!fullOutput) }}
                    className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                    {fullOutput
                      ? <Minimize2 data-testid='output-area-min-icon' size={22} />
                      : <Maximize2 data-testid='output-area-max-icon' size={22} />}
                  </Button>
                  <Button data-testid='output-area-collapse' onClick={() => { setCloseOutput(!closeOutput) }}
                    className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                    {closeOutput
                      ? <ChevronUp data-testid='output-area-up-icon' size={22} />
                      : <ChevronDown data-testid='output-area-down-icon' size={22} />}
                  </Button>
                </div>
              </div>
              <div data-testid="code-output-tab" className='h-full p-2.5 flex flex-col'>
                <ConsoleOutput logs={logs} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default CodingView;