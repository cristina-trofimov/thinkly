import { useEffect, useRef, useState, } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import CodeDescArea from "./CodeDescArea";
import { Play, RotateCcw, Maximize2, ChevronDown, Minimize2, ChevronUp, Terminal, MonitorCheck, CloudUpload } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../ui/dropdown-menu";
import { getSandpackConfigs } from "../helpers/SandpackConfig";
import type { ImperativePanelHandle } from 'react-resizable-panels';
import type { SubmissionType } from '../../types/SubmissionType.type';
import type { QuestionInfo } from '../../types/questions/QuestionsInfo.type';
import { useStateCallback } from '../helpers/UseStateCallback';
import MonacoEditor from "@monaco-editor/react";
import Console from "@code-editor/console-feed";
import { buildMonacoCode } from '../helpers/monacoConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';

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

  const templates = getSandpackConfigs(problemName, inputVars, outputType)
  const sampleTemps = {
    "Javascript": templates.Javascript,
    "Typescript": templates.Typescript,
  }

  const languages = Object.keys(sampleTemps) as Array<keyof typeof sampleTemps>

  const [selectedLang, setSelectedLang] = useStateCallback(languages[0])
  const { template, files } = sampleTemps[selectedLang]!

  const { code, language } = buildMonacoCode({
    language: "Javascript",
    problemName: "twoSum",
    inputVars: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    outputType: "number[]",
  });

  // const [language, setLanguage] = useState("javascript");
  // const [code, setCode] = useState("");
  const [logs, setLogs] = useState([]);

  const outputTabs = [
    { id: 'preview', text: 'Preview', icon: <MonitorCheck size={16} /> },
    { id: 'console', text: 'Console', icon: <Terminal size={16} /> },
  ]

  const codePanelRef = useRef<ImperativePanelHandle>(null)
  const descPanelRef = useRef<ImperativePanelHandle>(null)
  const outputPanelRef = useRef<ImperativePanelHandle>(null)
  const codeAndOutputPanelRef = useRef<ImperativePanelHandle>(null)

  const [fullCode, setFullCode] = useStateCallback(false)
  const [fullOutput, setFullOutput] = useStateCallback(false)
  const [closeCode, setCloseCode] = useStateCallback(false)
  const [closeOutput, setCloseOutput] = useStateCallback(false)

  useEffect(() => {
    if (!descPanelRef.current || !codeAndOutputPanelRef.current
      || !codePanelRef.current || !outputPanelRef.current)
      return;

    let descSize, codeAndOutputSize, codeSize, outputSize;

    if (fullCode) {
      descSize = 0;
      codeAndOutputSize = 100;
      codeSize = 100;
      outputSize = 0;
    } else if (fullOutput) {
      descSize = 0;
      codeAndOutputSize = 100;
      codeSize = 0;
      outputSize = 100;
    } else if (closeCode && closeOutput) {
      descSize = 50;
      codeAndOutputSize = 50;
      codeSize = 65;
      outputSize = 35;
      setCloseCode(false)
      setCloseOutput(false)
    } else if (closeCode) {
      descSize = 50;
      codeAndOutputSize = 50;
      codeSize = 5;
      outputSize = 95;
    } else if (closeOutput) {
      descSize = 50;
      codeAndOutputSize = 50;
      codeSize = 95;
      outputSize = 5;
    } else {
      descSize = 50;
      codeAndOutputSize = 50;
      codeSize = 75;
      outputSize = 25;
    }

    descPanelRef.current.resize(descSize);
    codeAndOutputPanelRef.current.resize(codeAndOutputSize);
    codePanelRef.current.resize(codeSize);
    outputPanelRef.current.resize(outputSize);
  }, [fullCode, fullOutput, closeCode, closeOutput])

  return (
    <div className='px-2 h-182.5 min-h-[calc(90vh)] min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'>
    {/* // <SandboxProvider data-testid="sandbox-provider" key="sandbox-provider"
    //   template={template} files={files}
    //   options={{ autorun: true, activeFile: Object.keys(files)[0], }}
    //   // className='px-2 h-182.5 min-h-[calc(100vh-4.5rem)]
    //   className='px-2 h-182.5 min-h-[calc(90vh)]
    //   min-w-[calc(100vw-var(--sidebar-width)-0.05rem)]'
    // > */}
      {/* <SandboxLayout data-testid="sandbox-layout" > */}
        <div className='flex items-center justify-center mb-2 w-full' >
          <Button>
            <CloudUpload size={16} />Submit
          </Button>
        </div>
        <ResizablePanelGroup direction="horizontal" className='h-full w-full flex' >
          {/* Description panel */}
          <ResizablePanel data-testid="desc-area"
            defaultSize={50} ref={descPanelRef}
            className='mr-0.75 rounded-md border'
          >
            <CodeDescArea problemInfo={problemInfo}
              submissions={submissions} />
          </ResizablePanel>

          <ResizableHandle withHandle className="w-[0.35px] mx-[1.5px] border-none"
            style={{ background: "transparent" }} />

          {/* Second panel */}
          <ResizablePanel data-testid="second-panel"
            defaultSize={50} ref={codeAndOutputPanelRef}
          >
            <ResizablePanelGroup direction="vertical" >
              {/* Coding area panel */}
              <ResizablePanel
                defaultSize={65} ref={codePanelRef}
                className="ml-0.75 mb-1 rounded-md border"
              >
                <div data-testid="coding-area" >

                  <div className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                        border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                  >
                    <span className="text-lg font-medium" >Code</span>
                    <div className="grid grid-cols-4 gap-1">
                      {/* Size buttons */}
                      <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" >
                        <Play size={22} color="green" className='hover:fill-green fill-transparent' />
                      </Button>
                      <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-primary/25" >
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
                      <DropdownMenuTrigger asChild>
                        <Button data-testid='languageBtn'
                          className="bg-background text-black text-s font-semibold h-7
                                    hover:bg-primary/20 focus:bg-primary/55" >
                          {selectedLang}
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='z-9999999' >
                        <div data-testid='languageMenu'
                          className="z-10 bg-white w-26 border rounded-lg"
                        >
                          {languages.map((lang) => (
                            <DropdownMenuItem data-testid={`languageItem-${lang}`} key={lang}
                              className="text-s font-medium p-1 rounded-s hover:border-none hover:bg-primary/25"
                              onSelect={() => {
                                setSelectedLang(lang);
                              }}
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
                  // value={sampleTemps}
                  theme="vs-dark"
                  // onChange={(value) => setCode(value)}
                  options={{
                    fontSize: 14,
                    automaticLayout: true,
                  }}
                />
                {/* <SandboxCodeEditor data-testid="sandbox-code-editor" showRunButton
                  showLineNumbers showInlineErrors
                /> */}
              </ResizablePanel>

              <ResizableHandle withHandle className='my-[0.5px] border-none h-[0.5px]'
                style={{ background: "transparent", }} />

              {/* Output panel */}
              <ResizablePanel data-testid="output-area"
                defaultSize={35} ref={outputPanelRef}
                className="ml-0.75 mt-1 rounded-md border"
              >
                <Tabs data-testid="sandbox-tabs" className='border-none' defaultValue='preview' >
                  <TabsList data-testid="sandbox-tabs-list"
                    className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                        border-b border-border/75 dark:border-border/50 py-1.5"
                  >
                    <div className='w-full flex rounded-none h-10 bg-muted gap-2
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
                    <div className="grid grid-cols-2 gap-1">
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
                  <TabsContent data-testid="sandbox-tabs-content" value="preview" >
                    <div data-testid="preview"
                      style={{
                        background: "#e0ffff", color: "white", padding: "10px",
                        height: "200px", overflowY: "auto"
                      }}
                    >
                      {/* <Console logs={logs} variant="dark" /> */}
                    </div>
                  </TabsContent>
                  <TabsContent data-testid="sandbox-tabs-content" value="console">
                    <div data-testid="console"
                      style={{
                        background: "#1e1e1e", color: "white", padding: "10px",
                        height: "200px", overflowY: "auto"
                      }}
                    >
                      {/* <Console logs={logs} variant="dark" /> */}
                    </div>
                  </TabsContent>
                </Tabs>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      {/* </SandboxLayout> */}
    {/* </SandboxProvider> */}
    </div>
  );
};

export default CodingView;