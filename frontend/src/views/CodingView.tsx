import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { buildMonacoCode } from '../components/helpers/monacoConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { type SupportedLanguagesType, supportedLanguages } from '@/types/questions/SupportedLanguages';
import { submitToJudge0 } from '@/api/Judge0API';
import Testcases from '../components/codingPage/Testcases';
import { useLocation } from 'react-router-dom';
import type { Question } from '@/types/questions/Question.type';
import { useTestcases } from '../components/helpers/useTestcases';
import type { Judge0Response } from '@/types/questions/Judge0Response';
import Loader from '../components/helpers/Loader';
import ConsoleOutput from '../components/codingPage/ConsoleOutput';
import { submitAttempt } from '@/api/CodeSubmissionAPI';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';
import type { MostRecentSub } from '@/types/MostRecentSub.type';
import { getAllQuestionInstancesByEventID, getQuestionInstance } from '@/api/QuestionInstanceAPI';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import type { Competition } from '@/types/competition/Competition.type';
import type { BaseEvent } from '@/types/BaseEvent.type';
import { getEventByName } from '@/api/BaseEventAPI';
import type { QuestionInstance } from '@/types/questions/QuestionInstance.type';
import { getQuestionByID } from '@/api/QuestionsAPI';
import { getProfile } from '@/api/AuthAPI';


const CodingView = () => {
  const location = useLocation()
  // const algo: AlgoTimeSeries = location?.state?.algo
  // AlgoTimeSession

  const comp: Competition = location?.state?.comp
  const question: Question = location?.state?.problem
  const [ questions, setQuestions ] = useState<Question[]>([])
  const [ activeQuestion, setActiveQuestion ] = useState<Question>()
  const [ questionsInstances, setQuestionsInstances ] = useState<QuestionInstance[]>([])
  const [ activeQuestionInstance, setActiveQuestionInstance ] = useState<QuestionInstance>()
  const [ event, setEvent ] = useState<BaseEvent | null>(null)

  const [ activeDisplayQuestionName, setActiveDisplayQuestionName ] = useState<string>("Question 1")

  const [ isQuestionLoading, setIsQuestionLoading ] = useState<boolean>(false)
  const [ isAsyncLoading, setIsAsyncLoading ] = useState<boolean>(false)
  const [ loadingMsg, setLoadingMsg ] = useState<string>("")

  const [ mostRecentSub, setMostRecentSub ] = useState<MostRecentSub>()
  const [ mostRecentSubGroupClass, setMostRecentSubGroupClass ] = useState<string>('grid grid-cols-2 gap-4')
  const [ logs, setLogs ] = useState<Judge0Response[]>([])
  const [ currentOutputTab, setCurrentOutputTab ] = useState<string>('testcases')

  // Getting the competition or algotime event if it exists
  useEffect(() => {
    if(comp?.id) {
      const InitializeEvent = async () => {
        setIsQuestionLoading(true)
        try {
          await getEventByName(location?.state?.comp?.competitionTitle)
            .then((response) => {
              setEvent(response)
            })
        } catch (err) {
          console.error("Failed to fetch event: ", err)
          toast.error("Error when fetching event.", {
            position: 'top-right',
            style: { backgroundColor: '#E9DADA' }
          })
        } finally {
          setIsQuestionLoading(false)
        }
      }
      InitializeEvent()
    }
  }, [comp?.id])

  // Getting the question instance (if it's a practice question and no event was passed)
  // Or all the question instances associated to the given event
  useEffect(() => {
    if (event) {
      const InitializeQuestionInstances = async () => {
        setIsQuestionLoading(true)
        try {
          await getAllQuestionInstancesByEventID(event?.event_id)
            .then((response) => {
                setQuestionsInstances(response)
            })
        } catch (err) {
          console.error("Failed to fetch question instances: ", err)
          toast.error("Error when fetching question instances.", {
            position: 'top-right',
            style: { backgroundColor: '#E9DADA' }
          })
        } finally {
          setIsQuestionLoading(false)
        }
      }
      InitializeQuestionInstances()
    } else if(question?.question_id) {
      const initQuestion = async () => {
        setIsQuestionLoading(true)
        try {
          await getQuestionInstance(question?.question_id, null)
            .then((response) => {
              setQuestionsInstances([response])
            })
        } catch (err) {
          console.error("Failed to fetch question instance: ", err)
          toast.error("Error when fetching question instance.", {
            position: 'top-right',
            style: { backgroundColor: '#E9DADA' }
          })
        } finally {
          setIsQuestionLoading(false)
        }
      }
      initQuestion()
      setQuestions([question])
    }
  }, [event, question?.question_id])

  // If an event is passed, get all the associated questions' details 
  useEffect(() => {
    if (!questionsInstances?.length || questions.length >= questionsInstances.length) {
      setIsQuestionLoading(false)
      return
    }

    const fetchQuestions = async () => {
      setIsQuestionLoading(true)
      try {
        // Fetch all in parallel
        const questionPromises = questionsInstances.map(qi => getQuestionByID(qi.question_id) )
        const fetchedResponses = await Promise.all(questionPromises)

        setQuestions(fetchedResponses)
      } catch (err) {
        console.error("Failed to fetch questions: ", err)
        toast.error("Error when fetching questions.", {
          position: 'top-right',
          style: { backgroundColor: '#E9DADA' }
        })
      } finally {
        setIsQuestionLoading(false)
      }
    }

    fetchQuestions()
  }, [questionsInstances])

  // Setting the default active question and question instance
  useEffect(() => {
    if (questions.length > 0 && !activeQuestion) {
      setActiveQuestion(questions[0])
    }
    if (questionsInstances.length > 0 && !activeQuestionInstance) {
      setActiveQuestionInstance(questionsInstances[0])
    }
  }, [questions, questionsInstances])


  const { testcases } = useTestcases(activeQuestionInstance?.question_id)
  const outputTabs = [
    { id: 'testcases', text: 'Testcases', icon: <MonitorCheck size={16} /> },
    { id: 'results', text: 'Results', icon: <Terminal size={16} /> },
  ]

  const {
    trackCodingPageOpened,
    trackLanguageChanged,
    trackCodeReset,
    trackCodeRun,
    trackCodeSubmitted,
  } = useAnalytics()

  const submitCode = async () => {
    try {
      setIsAsyncLoading(true)
      setLoadingMsg("Submitting")

      const user = await getProfile()
      const { codeRunResponse, submissionResponse, } = await submitAttempt(activeQuestionInstance, user.id, event?.event_id, code, judgeID, testcases)

      if (submissionResponse.status_code === 200) {
        toast.success(submissionResponse.message, {
          position: 'top-right',
          style: { backgroundColor: '#DAE9DA' }
        })
      } else {
        toast.warning(submissionResponse.message, {
          position: 'top-right',
          style: { backgroundColor: '#E9E2DA' }
        })
      }

      setLogs(prev => [...prev, codeRunResponse.judge0Response])
      setMostRecentSub(codeRunResponse.mostRecentSubResponse)
      setCurrentOutputTab("results")

      trackCodeSubmitted(
        activeQuestion?.question_id,
        selectedLang,
      )
    } catch (err) {
      toast.error("Error when submitting the code.", {
        position: 'top-right',
        style: { backgroundColor: '#E9DADA' }
      })
      throw err
    } finally {
      setIsAsyncLoading(false)
      setLoadingMsg("")
    }
  }

  const runCode = async () => {
    try {
      setIsAsyncLoading(true)
      setLoadingMsg("Running")

      const user = await getProfile()
      const { judge0Response, mostRecentSubResponse } = await submitToJudge0(user.id, activeQuestionInstance?.question_instance_id, code, judgeID, testcases)
      
      setLogs(prev => [...prev, judge0Response])
      setMostRecentSub(mostRecentSubResponse)
      setCurrentOutputTab("results")

      // Capture run result — status comes directly from Judge0 response
      const passed = judge0Response.status.description === "Accepted"
      trackCodeRun(
        activeQuestion?.question_id,
        selectedLang,
        judge0Response.status.description,
        passed,
        judge0Response.time ?? undefined
      )
    } catch (err) {
      toast.error("Error when running the code.", {
        position: 'top-right',
        style: { backgroundColor: '#E9DADA' }
      })
      throw err
    } finally {
      setIsAsyncLoading(false)
      setLoadingMsg("")
    }
  }

  const [selectedLang, setSelectedLang] = useState<SupportedLanguagesType>("Java")
  // Keep a ref to the previous language so we can log "from → to" on change
  const prevLangRef = useRef<SupportedLanguagesType>("Java")

  const { language, judgeID, templateCode } = buildMonacoCode({
    language: selectedLang,
    problemName: question?.title ?? "",
    inputVars: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    outputType: "number[]",
  });

  const [code, setCode] = useState<string>(templateCode || '')

  // Reset editor on language change
  useEffect(() => { setCode(templateCode) }, [selectedLang]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mostRecentSub) {
      setMostRecentSubGroupClass("grid grid-cols-3 gap-2")
    } else {
      setMostRecentSubGroupClass("grid grid-cols-2 gap-4")
    }
  }, [mostRecentSub])

  const handleLanguageChange = (lang: SupportedLanguagesType) => {
    trackLanguageChanged(activeQuestion?.question_id, prevLangRef.current, lang)
    prevLangRef.current = lang
    setSelectedLang(lang)
    setCode(templateCode)
  }

  const handleQuestionChange = (q: Question) => {
    // trackLanguageChanged(question.question_id, prevLangRef.current, lang)
    // prevLangRef.current = lang
    setActiveQuestion(q)
    questionsInstances.forEach((qi, idx) => {
      if (qi.question_id === q.question_id) {
        setActiveQuestionInstance(qi)
        setActiveDisplayQuestionName(`Question ${idx + 1}`)
      }
    })
  }

  const handleCodeReset = () => {
    trackCodeReset(activeQuestion?.question_id, selectedLang)
    setCode(templateCode)
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

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No problem loaded. Please navigate from the problem list.</p>
      </div>
    );
  }

  return (
    <div data-testid="sandbox" key="sandbox"
      className='px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'
    >
      {/* Loading modal */}
      <Loader isOpen={isQuestionLoading || isAsyncLoading} msg={loadingMsg} />
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
              className="bg-background text-black text-base font-bold h-7
                flex items-center gap-2 rounded-md p-2
                hover:bg-primary/20 focus:bg-primary/55"
            >
              {activeDisplayQuestionName}
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent className='z-999' asChild>
              <div data-testid='questions-menu'
                className="z-10 text-sm bg-white w-26 border rounded-lg"
              >
                {questions.map((q, idx) => (
                  <DropdownMenuItem data-testid={`questionItem-${q.question_name}`} key={q.question_name}
                    className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
                    onSelect={() => handleQuestionChange(q)}
                  >
                  {`Question ${idx+1}`}
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
          <CodeDescArea question={activeQuestion} question_instance={activeQuestionInstance} />
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
                      <Play size={22} color="green" className='hover:fill-green fill-transparent' />
                    </Button>
                    <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25"
                      onClick={handleCodeReset}
                    >
                      <RotateCcw size={22} color="black" />
                    </Button>
                    <Button data-testid='code-area-fullscreen' onClick={() => { setFullCode(!fullCode) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25">
                      {fullCode
                        ? <Minimize2 data-testid='code-area-min-icon' size={22} color="black" />
                        : <Maximize2 data-testid='code-area-max-icon' size={22} color="black" />}
                    </Button>
                    <Button data-testid='code-area-collapse' onClick={() => { setCloseCode(!closeCode) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25">
                      {closeCode
                        ? <ChevronDown data-testid='code-area-down-icon' size={22} color="black" />
                        : <ChevronUp data-testid='code-area-up-icon' size={22} color="black" />}
                    </Button>
                  </div>
                </div>
                <div className="w-full rounded-none h-10 border-b border-border/75 dark:border-border/50 py-1.5 px-2">
                  <DropdownMenu data-testid='language-dropdown'>
                    <DropdownMenuTrigger
                      data-testid='language-btn'
                        className="bg-background text-black text-base font-bold h-7
                          flex items-center gap-2 rounded-md p-2
                          hover:bg-primary/20 focus:bg-primary/55"
                    >
                      {selectedLang}
                      <ChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='z-999' asChild>
                      <div data-testid='language-menu'
                        className="z-10 text-sm bg-white w-26 border rounded-lg"
                      >
                        {supportedLanguages.map((lang) => (
                          <DropdownMenuItem data-testid={`languageItem-${lang}`} key={lang}
                            className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
                            onSelect={() => handleLanguageChange(lang)}
                          >
                            {lang}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <MonacoEditor
                key={language}
                language={language}
                value={code}
                theme="vs-dark"
                onChange={(value) => { setCode(value ?? templateCode) }}
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
                            <Button data-testid='most-recent-sub-btn' onClick={() => { setCode(mostRecentSub?.code || templateCode) }}
                              className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25">
                              <UndoDot size={22} color='black' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className='z-99999999999999 p-1.5 text-sm bg-white border rounded-3xl' >
                              Go back to the most recently ran code
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button data-testid='output-area-fullscreen' onClick={() => { setFullOutput(!fullOutput) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25">
                      {fullOutput
                        ? <Minimize2 data-testid='output-area-min-icon' size={22} color="black" />
                        : <Maximize2 data-testid='output-area-max-icon' size={22} color="black" />}
                    </Button>
                    <Button data-testid='output-area-collapse' onClick={() => { setCloseOutput(!closeOutput) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25">
                      {closeOutput
                        ? <ChevronUp data-testid='output-area-up-icon' size={22} color="black" />
                        : <ChevronDown data-testid='output-area-down-icon' size={22} color="black" />}
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