import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import CodeDescArea from "../components/codingPage/CodeDescArea";
import {
  Play, RotateCcw, Maximize2, ChevronDown,
  Minimize2, ChevronUp, CloudUpload, UndoDot
} from "lucide-react";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Panel, type ImperativePanelGroupHandle, PanelGroup } from 'react-resizable-panels';
import MonacoEditor from "@monaco-editor/react";
import { submitToJudge0 } from '@/api/Judge0API';
import { useLocation } from 'react-router-dom';
import type { Question } from '@/types/questions/QuestionPagination.type';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
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
import { useCardReveal } from '@/hooks/useCardReveal';
import CodingViewSkeleton from '@/components/codingPage/CodingViewSkeleton';
import { ResizableHandle } from '@/components/ui/resizable';

const getPanelLayouts = ({
  fullCode,
  fullOutput,
  closeCode,
  closeOutput,
}: {
  fullCode: boolean
  fullOutput: boolean
  closeCode: boolean
  closeOutput: boolean
}) => {
  if (fullCode) {
    return { mainPanelSize: [0, 100], codePanelSize: [100, 0] }
  }

  if (fullOutput) {
    return { mainPanelSize: [0, 100], codePanelSize: [0, 100] }
  }

  if (closeCode && !closeOutput) {
    return { mainPanelSize: [50, 50], codePanelSize: [10, 90] }
  }

  if (closeOutput && !closeCode) {
    return { mainPanelSize: [50, 50], codePanelSize: [90, 10] }
  }

  return { mainPanelSize: [50, 50], codePanelSize: [65, 35] }
}

const canInteractWithQuestion = (
  activeQuestionInstance: { riddle_id?: number | null } | null | undefined,
  userQuestionInstance: { riddle_complete?: boolean | null } | null | undefined,
) => !(activeQuestionInstance?.riddle_id && !userQuestionInstance?.riddle_complete)

const QuestionSelector = ({
  activeDisplayQuestionName,
  questions,
  onQuestionChange,
}: {
  activeDisplayQuestionName: string
  questions: Question[]
  onQuestionChange: (question: Question) => void
}) => (
  <div className='flex items-end-safe justify-end mb-2 w-full'>
    <DropdownMenu data-testid='questions-dropdown'>
      <DropdownMenuTrigger
        data-testid='questions-btn'
        className="bg-background text-muted-foreground text-base font-bold h-7
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
          {questions.map((question, index) => (
            <DropdownMenuItem data-testid={`questionItem-${question.question_name}`} key={question.question_name}
              className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
              onSelect={() => onQuestionChange(question)}
            >
              {`Question ${index + 1}`}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)

const CodingViewInitialState = ({
  shouldShowFallback,
  hasActiveQuestion,
}: {
  shouldShowFallback: boolean
  hasActiveQuestion: boolean
}) => {
  if (shouldShowFallback) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Nothing loaded. Please try again from the problem list, the competition or the algotime pages.</p>
      </div>
    )
  }

  if (!hasActiveQuestion) {
    return (
      <div className="px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]">
        <div className='flex items-center justify-center mb-2 w-full'>
          <Button disabled data-testid="submit-btn" key="submit-btn">
            <CloudUpload size={16} />Submit
          </Button>
        </div>
        <CodingViewSkeleton />
      </div>
    )
  }

  return null
}

const getCodingViewInitialState = (
  shouldShowFallback: boolean,
  hasActiveQuestion: boolean,
) => (
  <CodingViewInitialState
    shouldShowFallback={shouldShowFallback}
    hasActiveQuestion={hasActiveQuestion}
  />
)


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
    selectedLang, setSelectedLang, event,
    testcases, isLoading
  } = useCodingHooks(question, comp, algo)

  const {
    trackLanguageChanged,
    trackCodeReset,
    trackCodeRun,
    trackCodeSubmitted,
  } = useAnalytics()

  const{user} = useUser();

  const [theme, setTheme] = useState<string>(
    localStorage.getItem("theme") === "dark" ? "vs-dark" : "vs"
  )

  const [logs, setLogs] = useState<Judge0Response[]>([])
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [latestSubmissionResult, setLatestSubmissionResult] = useState<SubmissionType | null>(null)
  const shouldShowFallback = !isLoading && !activeQuestion
  const isContentReady = Boolean(
    activeQuestion &&
    activeQuestionInstance &&
    selectedLang &&
    (!user || userQuestionInstance)
  )
  const isPageLoading = !shouldShowFallback && (isLoading || !isContentReady)
  const isSubmitDisabled = isPageLoading || submissionState === 'loading'
  const contentVisible = useCardReveal(isPageLoading, isPageLoading ? 0 : 1)
  const showCodingSkeleton = isPageLoading || !contentVisible

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
    if (!canInteractWithQuestion(activeQuestionInstance, userQuestionInstance)) {
      toast.warning('Please answer the riddle first...')
      return
    }

    if (event && mostRecentSub && (Date.now() > mostRecentSub.submitted_on.getTime() + event.question_cooldown)) {
      toast.warning(`You're submitting too fast.\nTry again after ${(mostRecentSub.submitted_on.getTime() + event.question_cooldown)}`)
      return
    }

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

      const {
        codeRunResponse,
        submissionResponse,
        mostRecentSubResponse
      } = await submitAttempt(
        activeQuestion, activeQuestionInstance,
        userQuestionInstance, event,
        code, selectedLang?.lang_judge_id, testcases, user?.id ?? 0, !!algo)

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
  }

  const runCode = async () => {
    if (!canInteractWithQuestion(activeQuestionInstance, userQuestionInstance)) {
      toast.warning('Please answer the riddle first...')
      return
    }

    try {
      setSubmissionState('loading')

      const { judge0Response } = await submitToJudge0(activeQuestionInstance?.question_instance_id,
        code, selectedLang?.lang_judge_id, testcases, user?.id ?? 0)

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
      setSubmissionState('done')
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

  // Priority: composed starter fields -> template_code -> generic fallback comment
  const commentChar = selectedLang?.monaco_id === 'python' ? '#' : '//'
  const fallbackComment = `${commentChar} Write your solution here.`
  const composedStarterCode = [
    activeLangProps?.imports,
    activeLangProps?.preset_classes,
    activeLangProps?.preset_functions,
    activeLangProps?.main_function,
  ]
    .filter((section): section is string => Boolean(section?.trim()))
    .join('\n\n')

  const presetCode = composedStarterCode || activeLangProps?.template_code || fallbackComment

  const [code, setCode] = useState<string>('')

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

  useLayoutEffect(() => {
    const { mainPanelSize, codePanelSize } = getPanelLayouts({
      fullCode,
      fullOutput,
      closeCode,
      closeOutput,
    })

    mainPanelGroup.current?.setLayout(mainPanelSize)
    codePanelGroup.current?.setLayout(codePanelSize)
  }, [fullCode, fullOutput, closeCode, closeOutput])

  const initialState = shouldShowFallback || !activeQuestion
    ? getCodingViewInitialState(shouldShowFallback, Boolean(activeQuestion))
    : null

  if (initialState !== null) {
    return initialState
  }

  return (
    <div className="px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]">
      <ConfirmCodeReset isOpen={clearingCode} setClose={() => setClearingCode(false)}
        setReset={() => setConfirmClearingCode(true)} setNoReset={() => setConfirmClearingCode(false)}
      />
      <div className='flex items-center justify-center mb-2 w-full'>
        <Button onClick={submitCode} disabled={isSubmitDisabled} data-testid="submit-btn" key="submit-btn">
          <CloudUpload size={16} />Submit
        </Button>
      </div>
      {showCodingSkeleton && <CodingViewSkeleton />}
      <div data-testid="sandbox" key="sandbox"
        className={`${contentVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} h-[calc(100%-2.75rem)] motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out`}
      >
      {questionsInstances.length > 1 && (
        <QuestionSelector
          activeDisplayQuestionName={activeDisplayQuestionName}
          questions={questions}
          onQuestionChange={handleQuestionChange}
        />
      )}
      <PanelGroup ref={mainPanelGroup} direction="horizontal" data-testid="panel-group"
        className='h-full w-full'
      >
        {/* Description panel */}
        <Panel data-testid="resizable-panel" key="desc-area"
          defaultSize={50} minSize={5}
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
            onRiddleSolved={handleRiddleSolved}
          />
        </Panel>

        <ResizableHandle data-testid="resizable-handle" />

        {/* Second panel */}
        <Panel defaultSize={50} data-testid="resizable-panel">
          <PanelGroup direction="vertical" ref={codePanelGroup} data-testid="panel-group">
            {/* Coding area panel */}
            <Panel defaultSize={65} data-testid="resizable-panel"
              className="ml-0.75 rounded-md border"
            >
              <div data-testid="coding-area">
                <div data-testid="coding-btns"
                  className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                    border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                >
                  <span className="text-lg font-medium">Code</span>
                  <div className="grid grid-cols-4 gap-1">
                    <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25"
                      onClick={runCode} data-testid="play-btn"
                    >
                      <Play size={24} color="green" strokeWidth={2.5} className='hover:fill-green-400 fill-transparent' />
                    </Button>
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
                      {fullCode
                        ? <Minimize2 data-testid='code-area-min-icon' size={22} />
                        : <Maximize2 data-testid='code-area-max-icon' size={22} />}
                    </Button>
                    <Button data-testid='code-area-collapse' onClick={() => { setCloseCode(!closeCode) }}
                      className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                      {closeCode
                        ? <ChevronDown data-testid='code-area-down-icon' size={22} />
                        : <ChevronUp data-testid='code-area-up-icon' size={22} />}
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
                                trackLanguageChanged(activeQuestion.question_id, prevLangRef.current, lang)
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

            <ResizableHandle data-testid="resizable-handle" />
            {/* Output panel */}
            <Panel data-testid="resizable-handle" defaultSize={35}
              className="ml-0.75 rounded-md border"
            >
              <div data-testid="output-area"
                className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                  border-b border-border/75 dark:border-border/50 py-1.5 px-4"
              >
                <span className="text-lg font-medium">Output</span>
                <div data-testid="output-btns"
                  className={`grid grid-cols-${mostRecentSub ? 3 : 2} gap-2`} >
                  {mostRecentSub && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button data-testid='most-recent-sub-btn' onClick={() => { setCode(mostRecentSub?.code || presetCode) }}
                            className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                            <UndoDot size={22} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side='left' >
                          <p className='z-99999999999999 p-1.5 text-sm bg-accent text-accent-foreground border rounded-3xl' >
                            Go back to the most recently ran code
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
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
              <div data-testid="code-output-tab" className='max-h-full p-2.5'>
                <ConsoleOutput logs={logs} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
      </div>
    </div>
  );
};

export default CodingView;
