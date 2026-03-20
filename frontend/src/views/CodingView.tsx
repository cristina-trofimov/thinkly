import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import CodeDescArea from "../components/codingPage/CodeDescArea";
import {
  Play, RotateCcw, Maximize2, ChevronDown,
  Minimize2, ChevronUp, Terminal, MonitorCheck, CloudUpload, UndoDot
} from "lucide-react";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Panel, type ImperativePanelGroupHandle, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import MonacoEditor from "@monaco-editor/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { submitToJudge0 } from '@/api/Judge0API';
import Testcases from '../components/codingPage/Testcases';
import { useLocation } from 'react-router-dom';
import type { Question } from '@/types/questions/QuestionPagination.type';
import Loader from '../components/helpers/Loader';
import ConsoleOutput from '../components/codingPage/ConsoleOutput';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import type { Competition } from '@/types/competition/Competition.type';
import { getProfile } from '@/api/AuthAPI';
import { logFrontend } from '@/api/LoggerAPI';
import { useCodingHooks } from '@/components/helpers/CodingHooks';
import { putUserInstance } from '@/api/UserQuestionInstanceAPI';
import type { Judge0Response } from '@/types/questions/Judge0Response';
import { submitAttempt } from '@/api/SubmitCodeAPI';
import ConfirmCodeReset from '@/components/helpers/ConfirmCodeReset';
import type { SubmissionType } from '@/types/submissions/SubmissionType.type'


const CodingView = () => {
  const location = useLocation()
  const comp: Competition = location?.state?.comp
  const question: Question = location?.state?.problem
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined)

  const {
    startTime, mostRecentSub, setMostRecentSub,
    isQuestionLoading, userQuestionInstance, setUserQuestionInstance,
    isAsyncLoading, setIsAsyncLoading,
    activeQuestion, setActiveQuestion,
    activeQuestionInstance, setActiveQuestionInstance,
    activeDisplayQuestionName, setActiveDisplayQuestionName,
    questions, questionsInstances, languages, prevLangRef,
    mostRecentSubGroupClass,
    selectedLang, setSelectedLang, event,
    testcases, loadingMsg, setLoadingMsg
  } = useCodingHooks(question, comp)

  const {
    trackLanguageChanged,
    trackCodeReset,
    trackCodeRun,
    trackCodeSubmitted,
  } = useAnalytics()

  useEffect(() => {
    getProfile()
      .then((user) => setCurrentUserId(user.id))
      .catch(() => setCurrentUserId(undefined))
  }, [])

  const [theme, setTheme] = useState<string>(
    localStorage.getItem("theme") === "dark" ? "vs-dark" : "vs"
  )

  const [logs, setLogs] = useState<Judge0Response[]>([])
  const [currentOutputTab, setCurrentOutputTab] = useState<string>('testcases')
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [latestSubmissionResult, setLatestSubmissionResult] = useState<SubmissionType | null>(null)
  const outputTabs = [
    { id: 'testcases', text: 'Testcases', icon: <MonitorCheck size={16} /> },
    { id: 'results', text: 'Results', icon: <Terminal size={16} /> },
  ]

  useEffect(() => {
    const handleThemeSync = () => {
      setTheme(localStorage.getItem("theme") === "dark" ? "vs-dark" : "vs")
    }

    window.addEventListener("storage", handleThemeSync)      // other tabs
    window.addEventListener("storage_sync", handleThemeSync) // same tab (NavUser)

    return () => {
      window.removeEventListener("storage", handleThemeSync)
      window.removeEventListener("storage_sync", handleThemeSync)
    }
  }, [])

  // Auto-select the first language that has preset code when the question changes
  useEffect(() => {
    if (!activeQuestion || !languages?.length) return

    const langWithPreset = activeQuestion.language_specific_properties.find(
      (p) => p.preset_code
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


  const submitCode = async () => {
    if (activeQuestionInstance?.riddle_id && !userQuestionInstance?.riddle_complete) {
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
        code, selectedLang?.lang_judge_id, testcases, currentUserId ?? 0)

      setLatestSubmissionResult(submissionResponse)
      setSubmissionState('done')

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
      throw err
    }
  }

  const runCode = async () => {
    if (activeQuestionInstance?.riddle_id && !userQuestionInstance?.riddle_complete) {
      toast.warning('Please answer the riddle first...')
      return
    }

    try {
      setIsAsyncLoading(true)
      setLoadingMsg("Running")

      const { judge0Response } = await submitToJudge0(activeQuestionInstance?.question_instance_id,
        code, selectedLang?.lang_judge_id, testcases, currentUserId ?? 0)

      setLogs(prev => [...prev, judge0Response])
      setCurrentOutputTab("results")

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
      throw err
    } finally {
      setIsAsyncLoading(false)
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

  // Priority: DB preset_code → DB template_solution → generic fallback comment
  const commentChar = selectedLang?.monaco_id === 'python' ? '#' : '//'
  const fallbackComment = `${commentChar} Write your solution here.`
  const presetCode = activeLangProps?.preset_code || activeLangProps?.template_solution || fallbackComment

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
    let mainPanelSize: number[], codePanelSize: number[]

    if (fullCode) {
      mainPanelSize = [0, 100]
      codePanelSize = [100, 0]
    } else if (fullOutput) {
      mainPanelSize = [0, 100]
      codePanelSize = [0, 100]
    } else if (closeCode && !closeOutput) {
      mainPanelSize = [50, 50]
      codePanelSize = [4.75, 95.25]
    } else if (closeOutput && !closeCode) {
      mainPanelSize = [50, 50]
      codePanelSize = [95.25, 4.75]
    } else {
      mainPanelSize = [50, 50]
      codePanelSize = [65, 35]
    }

    mainPanelGroup.current?.setLayout(mainPanelSize)
    codePanelGroup.current?.setLayout(codePanelSize)
  }, [fullCode, fullOutput, closeCode, closeOutput])

  if (!activeQuestion) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Nothing loaded. Please try again from the problem list, the competition or the algotime pages.</p>
      </div>
    );
  }

  return (
    <div data-testid="sandbox" key="sandbox"
      className='px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'
    >
      {/* Loading modal */}
      <Loader isOpen={isQuestionLoading || isAsyncLoading} msg={loadingMsg} />
      <ConfirmCodeReset isOpen={clearingCode} setClose={() => setClearingCode(false)}
        setReset={() => setConfirmClearingCode(true)} setNoReset={() => setConfirmClearingCode(false)}
      />
      <div className='flex items-center justify-center mb-2 w-full'>
        <Button onClick={submitCode} data-testid="submit-btn" key="submit-btn">
          <CloudUpload size={16} />Submit
        </Button>
      </div>
      {questionsInstances.length > 1 && (
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
            eventId={comp?.id}
            eventName={comp?.competitionTitle}
            isCompetitionEvent={!!comp}
            currentUserId={currentUserId}
            submissionState={submissionState}
            latestSubmissionResult={latestSubmissionResult}
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

            <PanelResizeHandle data-testid="resizable-handle"
              className='my-[0.5px] border-none h-[0.5px]'
              style={{ background: "transparent" }}
            />

            {/* Output panel */}
            <Panel data-testid="resizable-handle" defaultSize={35}
              className="ml-0.75 mt-1 rounded-md border"
            >
              <Tabs data-testid="sandbox-tabs" onValueChange={setCurrentOutputTab}
                value={currentOutputTab} className='border-none h-full'
              >
                <TabsList data-testid="sandbox-tabs-list"
                  className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                      border-b border-border/75 dark:border-border/50 py-1.5"
                >
                  <div className='w-full flex rounded-none h-10 bg-muted gap-3
                      border-b border-border/75 dark:border-border/50 py-0 px-4'
                  >
                    {outputTabs.map(tab => (
                      <TabsTrigger value={tab.id} key={tab.id} data-testid='sandbox-tabs-trigger'
                        className='bg-muted rounded-none
                        hover:border-t-2 hover:border-primary/40
                        data-[state=active]:border-primary
                        data-[state=active]:text-primary
                        data-[state=active]:bg-muted
                        data-[state=active]:shadow-none
                        data-[state=active]:border-b-[2.5px]
                        data-[state=active]:border-x-0
                        data-[state=active]:border-t-0
                        dark:data-[state=active]:border-primary
                        flex items-center gap-2 transition-all'
                      >
                        {tab.icon}{tab.text}
                      </TabsTrigger>
                    ))}
                  </div>
                  <div className={`pr-5 ${mostRecentSubGroupClass}`} >
                    {mostRecentSub && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button data-testid='most-recent-sub-btn' onClick={() => { setCode(mostRecentSub?.code || presetCode) }}
                              className="w-7 shadow-none text-accent-foreground bg-muted rounded-full hover:bg-primary/25">
                              <UndoDot size={22} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className='z-99999999999999 p-1.5 text-sm bg-muted text-accent-foreground border rounded-3xl' >
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
                </TabsList>
                <TabsContent data-testid="testcases-tab" value="testcases"
                  className='max-h-full p-2.5'>
                  <Testcases question_id={activeQuestionInstance?.question_id} />
                </TabsContent>
                <TabsContent data-testid="code-output-tab" value="results"
                  className='max-h-full p-2.5'>
                  <ConsoleOutput logs={logs} />
                </TabsContent>
              </Tabs>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default CodingView;