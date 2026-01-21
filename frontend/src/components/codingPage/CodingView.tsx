import React, { useEffect, useLayoutEffect, useState, } from 'react'
import CodeDescArea from "./CodeDescArea";
import { Play, RotateCcw, Maximize2, ChevronDown, Minimize2, ChevronUp, Terminal, MonitorCheck, CloudUpload } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Panel, type ImperativePanelGroupHandle, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useStateCallback } from '../helpers/UseStateCallback';
import MonacoEditor from "@monaco-editor/react";
import { buildMonacoCode } from '../helpers/monacoConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { type SupportedLanguagesType, supportedLanguages } from '@/types/questions/SupportedLanguages';
import { postCode } from '@/api/Judge0API';
import Testcases from './Testcases';
import { useLocation } from 'react-router-dom';
import type { Question } from '@/types/questions/Question.type';
import { useTestcases } from '../helpers/useTestcases';


const CodingView = () => {
  const { state } = useLocation()
  const question: Question = state.problem

  if (!question?.id) {
    console.log("Loading question")
    // TODO: add loader on screen
  }

  const { testcases, addTestcase, removeTestcase, loading,
        updateTestcase, activeTestcase, setActiveTestcase } 
    = useTestcases(question?.id)

  if (loading) {
    console.log("Loading test cases")
    // TODO: add loader on screen
  }

  const submitCode = () => {
    console.log("submitting code")
    // TODO: add loader on screen
  }

  const [logs, setLogs] = useState<Response[]>([]);

  const runCode = async () => {
    await postCode("64.58.46.96:2358", code, judgeID, "Judge0", null)
            .then((r) => setLogs((prev) => [...prev, r]))
    console.log("logs")
    console.log(logs)

    // let token = postCode(
    //   "#include <stdio.h>\n\nint main(void) {\n  char name[10];\n  scanf(\"%s\", name);\n  printf(\"hello, %s\\n\", name);\n  return 0\n}",
    //   "50", "Judge0", null
    // )
    // console.log(token)
    // let response = getCodeResponse("d42360ba-0746-4049-863f-a496295233ca")
    // console.log(response)
  }

  const [selectedLang, setSelectedLang] = useStateCallback<SupportedLanguagesType>("Java")

  const { language, judgeID, templateCode } = buildMonacoCode({
    language: selectedLang,
    problemName: question.title,
    inputVars: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    outputType: "number[]",
  });

  const [ code, setCode ] = useStateCallback<string>(templateCode)

  useEffect(() => { setCode(templateCode) }, [selectedLang]) // reset editor

  const outputTabs = [
    { id: 'testcases', text: 'Testcases', icon: <MonitorCheck size={16} /> },
    { id: 'results', text: 'Results', icon: <Terminal size={16} /> },
  ]

  const [fullCode, setFullCode] = useState(false)
  const [fullOutput, setFullOutput] = useState(false)
  const [closeCode, setCloseCode] = useState(false)
  const [closeOutput, setCloseOutput] = useState(false)

  const mainPanelGroup = React.useRef<ImperativePanelGroupHandle>(null)
  const codePanelGroup = React.useRef<ImperativePanelGroupHandle>(null)

  useLayoutEffect(() => {
    let mainPanelSize: number[], codePanelSize: number[]

    if (fullCode) {
      mainPanelSize = [0, 100] // 1st is desc, 2nd is editor
      codePanelSize = [100, 0] // 1st is code, 2nd is console
    } else if (fullOutput) {
      mainPanelSize = [0, 100]
      codePanelSize = [0, 100]
    } else if (closeCode && closeOutput) {
      mainPanelSize = [50, 50]
      codePanelSize = [65, 35]
    } else if (closeCode) {
      mainPanelSize = [50, 50]
      codePanelSize = [4.75, 95.25]
    } else if (closeOutput) {
      mainPanelSize = [50, 50]
      codePanelSize = [95.25, 4.75]
    } else {
      mainPanelSize = [50, 50]
      codePanelSize = [65, 35]
    }

    mainPanelGroup.current?.setLayout(mainPanelSize)
    codePanelGroup.current?.setLayout(codePanelSize)
  }, [fullCode, fullOutput, closeCode, closeOutput])

  return (
    <div data-testid="sandbox" key="sandbox"
      className='px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'
    >
      <div className='flex items-center justify-center my-2 w-full' >
        <Button onClick={submitCode} data-testid="submit-btn" key="submit-btn" >
          <CloudUpload size={16} />Submit
        </Button>
      </div>
      <PanelGroup ref={mainPanelGroup} direction="horizontal" data-testid="panel-group"
        className='h-full w-full' 
      >
        {/* Description panel */}
        <Panel data-testid="resizable-panel" key="desc-area" //collapsible collapsedSize={5}
          defaultSize={50} minSize={5} //maxSize={100}
          className='mr-0.75 rounded-md border'
        >
          <CodeDescArea question={question} testcases={testcases} />
        </Panel>

        <PanelResizeHandle data-testid="resizable-handle" 
          className="w-[0.35px] mx-[1.5px] border-none"
          style={{ background: "transparent" }} 
        />

        {/* Second panel */}
        <Panel defaultSize={50} data-testid="resizable-panel" >
          <PanelGroup direction="vertical" ref={codePanelGroup} data-testid="panel-group" >
            {/* Coding area panel */}
            <Panel defaultSize={65} data-testid="resizable-panel"
              className="ml-0.75 mb-1 rounded-md border"
            >
              <div data-testid="coding-area" >
                <div className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                      border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                >
                  <span className="text-lg font-medium" >Code</span>
                  <div className="grid grid-cols-4 gap-1">
                    {/* Size buttons */}
                    <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" 
                      onClick={runCode}
                    >
                      <Play size={22} color="green" className='hover:fill-green fill-transparent' />
                    </Button>
                    <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" 
                      onClick={() => { setCode(templateCode) } } >
                      <RotateCcw size={22} color="black" />
                    </Button>
                    <Button data-testid='code-area-fullscreen' onClick={() => { setFullCode(!fullCode) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" >
                      {fullCode ? <Minimize2 data-testid='code-area-min-btn' size={22} color="black" />
                        : <Maximize2 data-testid='code-area-max-btn' size={22} color="black" />}
                    </Button>
                    <Button data-testid='code-area-collapse' onClick={() => { setCloseCode(!closeCode) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" >
                      {closeCode ? <ChevronDown data-testid='code-area-down-btn' size={22} color="black" />
                        : <ChevronUp data-testid='code-area-up-btn' size={22} color="black" />}
                    </Button>
                  </div>
                </div>
                <div className="w-full rounded-none h-10 border-b border-border/75 dark:border-border/50 py-1.5 px-2" >
                  <DropdownMenu data-testid='languageDropdown'>
                    <DropdownMenuTrigger>
                      <Button data-testid='languageBtn'
                        className="bg-background text-black text-base font-bold h-7
                                  hover:bg-primary/20 focus:bg-primary/55" >
                        {selectedLang}
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='z-999' asChild >
                      <div data-testid='languageMenu'
                        className="z-10 text-sm bg-white w-26 border rounded-lg"
                      >
                        {supportedLanguages.map((lang) => (
                          <DropdownMenuItem data-testid={`languageItem-${lang}`} key={lang}
                            className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
                            onSelect={() => { setSelectedLang(lang); setCode(templateCode) }}
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
                onChange={(value) => { setCode(value ?? templateCode) } }
                options={{
                  fontSize: 14,
                  automaticLayout: true,
                }}
              />
            </Panel>

            <PanelResizeHandle className='my-[0.5px] border-none h-[0.5px]'
              style={{ background: "transparent" }} 
            />
            {/* Output panel */}
            <Panel data-testid="resizable-panel" defaultSize={35} 
              className="ml-0.75 mt-1 rounded-md border"
            >
              <Tabs data-testid="sandbox-tabs" className='border-none' defaultValue='testcases' >
                <TabsList data-testid="sandbox-tabs-list"
                  className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                      border-b border-border/75 dark:border-border/50 py-1.5"
                >
                  <div className='w-full flex rounded-none h-10 bg-muted gap-3
                      border-b border-border/75 dark:border-border/50 py-0 px-4'
                  >
                    {outputTabs.map(tab => {
                      return <TabsTrigger value={tab.id} key={tab.id} data-testid='sandbox-tabs-trigger'
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
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pr-5">
                    {/* Size buttons */}
                    <Button data-testid='output-area-fullscreen' onClick={() => { setFullOutput(!fullOutput) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" >
                      {fullOutput ? <Minimize2 data-testid='output-area-min-btn' size={22} color="black" />
                        : <Maximize2 data-testid='output-area-max-btn' size={22} color="black" />}
                    </Button>
                    <Button data-testid='output-area-collapse' onClick={() => { setCloseOutput(!closeOutput) }}
                      className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" >
                      {closeOutput ? <ChevronUp data-testid='output-area-up-btn' size={22} color="black" />
                        : <ChevronDown data-testid='output-area-down-btn' size={22} color="black" />}
                    </Button>
                  </div>
                </TabsList>
                <TabsContent data-testid="testcases-tab" value="testcases" 
                  className='max-h-full p-2.5' >
                  <Testcases 
                    testcases={testcases} activeTestcase={activeTestcase}
                    setActiveTestcase={setActiveTestcase} addTestcase={addTestcase}
                    removeTestcase={removeTestcase} updateTestcase={updateTestcase}
                  />
                </TabsContent>
                <TabsContent data-testid="results-tab" value="results"
                  className='h-full'
                  style={{
                    background: "#1e1e1e", color: "white", padding: "10px",
                    overflowY: "auto"
                  }}
                >
                  {/* {logs.map((log) => (
                    <samp>{log}</samp>
                  ))} */}
                  {/* <samp>{logs}</samp> */}
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