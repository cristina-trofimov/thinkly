import React, { useEffect, useLayoutEffect, useState, } from 'react'
import CodeDescArea from "./CodeDescArea";
import { Play, RotateCcw, Maximize2, ChevronDown, Minimize2, ChevronUp, Terminal, MonitorCheck, CloudUpload } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Panel, type ImperativePanelGroupHandle, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { SubmissionType } from '../../types/SubmissionType.type';
import type { QuestionInfo } from '../../types/questions/QuestionsInfo.type';
import { useStateCallback } from '../helpers/UseStateCallback';
import MonacoEditor from "@monaco-editor/react";
import Console from "@code-editor/console-feed";
import { buildMonacoCode } from '../helpers/monacoConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { type SupportedLanguagesType, supportedLanguages } from '@/types/questions/SupportedLanguages';
import axiosClient from '@/lib/axiosClient';
import { getCodeResponse, postCode } from '@/api/Judge0API';

const CodingView = () => {
  const problemName = "problemName"
  const inputVars = [{ name: "test", type: "int" }, { name: "me", type: "string" }]
  const outputType = "int"

  const problemInfo: QuestionInfo = {
    title: "Sum",
    clarification: "some randome clarification",
    examples: [
      {
        inputs: [{ name: "test", type: "int" }, { name: "me", type: "string" }],
        outputs: [{ name: "test", type: "int" }],
        expectations: "bla bla bla",
      },
      {
        inputs: [{ name: "test", type: "int" }, { name: "me", type: "string" }],
        outputs: [{ name: "test", type: "int" }],
        expectations: "bla bla bla",
      },
      {
        inputs: [{ name: "test", type: "int" }, { name: "me", type: "string" }],
        outputs: [{ name: "test", type: "int" }],
        expectations: "bla bla bla",
      },
    ],
    description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nec diam ac mauris venenatis dapibus eget non urna. In hac habitasse platea dictumst. Nunc hendrerit vestibulum sodales. Sed gravida a lacus quis luctus. Duis at lorem sit amet massa accumsan tempus eu et eros. Nam ullamcorper, ligula in varius pellentesque, enim ex facilisis eros, sit amet lacinia ex est sit amet nulla. Praesent congue vehicula tellus ullamcorper pretium. Aenean imperdiet risus quis felis dictum vestibulum. Donec et leo ultrices, pellentesque diam id, volutpat metus. Suspendisse ultrices nisi eget ipsum commodo, non posuere velit dignissim. Aenean id mi a nisi sagittis pellentesque non nec libero. Proin et orci erat. Quisque consectetur consequat tincidunt. Ut vulputate sem in nisl laoreet feugiat.

    Ut efficitur metus vel nisl hendrerit laoreet. Donec ultrices hendrerit tincidunt. Nam felis elit, aliquam id mattis ac, pellentesque at libero. Duis faucibus vitae urna et rhoncus. In a neque velit. Aenean quis ultrices mi. In fringilla libero a lectus imperdiet tristique. Sed at odio auctor, fringilla ante sed, accumsan felis.`
  }

  const submissions: SubmissionType[] = [
    { "status": "Accepted", "language": "Java", "memory": "15.6 MB", "runtime": "14 MS", "submittedOn": "2025-10-27 17:40" },
    { "status": "Runtime Error", "language": "Java", "memory": "N/A", "runtime": "N/A", "submittedOn": "2025-10-23 17:40" },
    { "status": "Wrong Answer", "language": "Java", "memory": "N/A", "runtime": "N/A", "submittedOn": "2025-10-24 17:40" },
  ]

  const submitCode = () => {
    console.log("submitting code")
  }

  const runCode = async () => {

    await postCode(code, judgeID, "Judge0", null)
      .then((response) => {
        let responseDetails = getCodeResponse(response)
        console.log(responseDetails)
        setLogs(logs + "</br></br>" + responseDetails )
      })

    // let response = await postCode(code, judgeID, "Judge0", null)

    // console.log("responseDetails")
    // let responseDetails = await getCodeResponse(response)
    // console.log(responseDetails)
    // setLogs(logs + "</br></br>" + responseDetails )
    


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
    problemName: "twoSum",
    inputVars: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    outputType: "number[]",
  });

  const [ code, setCode ] = useStateCallback<string>(templateCode)
  const [logs, setLogs] = useState("");
  // const [logs, setLogs] = useState([]);

  useEffect(() => { setCode(templateCode) }, [selectedLang]) // reset editor

  const outputTabs = [
    { id: 'preview', text: 'Preview', icon: <MonitorCheck size={16} /> },
    { id: 'console', text: 'Console', icon: <Terminal size={16} /> },
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
      codePanelSize = [75, 25]
    }

    mainPanelGroup.current?.setLayout(mainPanelSize)
    codePanelGroup.current?.setLayout(codePanelSize)
  }, [fullCode, fullOutput, closeCode, closeOutput])

  return (
    <div data-testid="sandbox-provider" key="sandbox-provider"
      className='px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'
    >
      <div className='flex items-center justify-center my-2 w-full' >
        <Button onClick={submitCode} >
          <CloudUpload size={16} />Submit
        </Button>
      </div>
      <PanelGroup ref={mainPanelGroup} direction="horizontal"
        className='h-full w-full' 
      >
        {/* Description panel */}
        <Panel data-testid="desc-area" //collapsible collapsedSize={5}
          defaultSize={50} minSize={5} //maxSize={100}
          className='mr-0.75 rounded-md border'
        >
          <CodeDescArea problemInfo={problemInfo}
            submissions={submissions} />
        </Panel>

        <PanelResizeHandle className="w-[0.35px] mx-[1.5px] border-none"
          style={{ background: "transparent" }} 
        />

        {/* Second panel */}
        <Panel data-testid="second-panel" defaultSize={50} >
          <PanelGroup direction="vertical" ref={codePanelGroup} >
            {/* Coding area panel */}
            <Panel defaultSize={65}
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
                    <DropdownMenuContent className='z-999' >
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
            <Panel data-testid="output-area" defaultSize={35} 
              className="ml-0.75 mt-1 rounded-md border"
            >
              <Tabs data-testid="sandbox-tabs" className='border-none' defaultValue='preview' >
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
                <TabsContent data-testid="preview-tab" value="preview" >
                  <div data-testid="preview" className='h-full'
                    style={{
                      background: "#e0ffff", color: "white", padding: "10px",
                      overflowY: "auto"
                    }}
                  >
                    {/* <Console logs={logs} variant="dark" /> */}
                    {/* <SandpackConsole /> */}
                  </div>
                </TabsContent>
                <TabsContent data-testid="output-tab" value="console">
                  <div data-testid="console" className='h-full'
                    style={{
                      background: "#1e1e1e", color: "white", padding: "10px",
                      overflowY: "auto"
                    }}
                  >
                    <samp>{logs}</samp>
                  </div>
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