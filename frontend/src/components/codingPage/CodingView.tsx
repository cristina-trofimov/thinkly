import { useEffect, useRef, } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import { SandboxConsole, SandboxLayout, SandboxPreview, SandboxProvider,
          SandboxTabs, SandboxTabsContent } from "../ui/shadcn-io/sandbox";
import CodingArea from "./CodingArea";
import CodeDescArea from "./CodeDescArea";
import CodeOutputArea from "./CodeOutputArea";
import { Play, RotateCcw, Maximize2, ChevronDown, Minimize2, ChevronUp, FileText, History, MessageCircle, Trophy } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "../ui/dropdown-menu";
import { getSandpackConfigs } from "../helpers/SandpackConfig";
import type { ImperativePanelHandle } from 'react-resizable-panels';
import type { SubmissionType } from '../interfaces/SubmissionType';
import type { ProblemInfo } from '../interfaces/ProblemInfo';
import type { CommentType } from '../interfaces/CommentType';
import type { LeaderboardType } from '../interfaces/LeaderboardType';
import { useStateCallback } from '../helpers/UseStateCallback';


const CodingView = () => {
// const CodingView = ({problemName, inputVars, outputType}: ) => {
  const problemName = "problemName"
  const inputVars = [{name: "test", type: "int"}, {name: "me", type: "string"}]
  const outputType = "int"

  const problemInfo: ProblemInfo = {
    title: "Sum",
    clarification: "some randome clarification",
    examples: [
        {
            inputs: [{name: "test", type: "int"}, {name: "me", type: "string"}],
            outputs: [{name: "test", type: "int"}],
            expectations: "bla bla bla",
        },
        {
            inputs: [{name: "test", type: "int"}, {name: "me", type: "string"}],
            outputs: [{name: "test", type: "int"}],
            expectations: "bla bla bla",
        },
        {
            inputs: [{name: "test", type: "int"}, {name: "me", type: "string"}],
            outputs: [{name: "test", type: "int"}],
            expectations: "bla bla bla",
        },
    ],
    description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nec diam ac mauris venenatis dapibus eget non urna. In hac habitasse platea dictumst. Nunc hendrerit vestibulum sodales. Sed gravida a lacus quis luctus. Duis at lorem sit amet massa accumsan tempus eu et eros. Nam ullamcorper, ligula in varius pellentesque, enim ex facilisis eros, sit amet lacinia ex est sit amet nulla. Praesent congue vehicula tellus ullamcorper pretium. Aenean imperdiet risus quis felis dictum vestibulum. Donec et leo ultrices, pellentesque diam id, volutpat metus. Suspendisse ultrices nisi eget ipsum commodo, non posuere velit dignissim. Aenean id mi a nisi sagittis pellentesque non nec libero. Proin et orci erat. Quisque consectetur consequat tincidunt. Ut vulputate sem in nisl laoreet feugiat.

    Ut efficitur metus vel nisl hendrerit laoreet. Donec ultrices hendrerit tincidunt. Nam felis elit, aliquam id mattis ac, pellentesque at libero. Duis faucibus vitae urna et rhoncus. In a neque velit. Aenean quis ultrices mi. In fringilla libero a lectus imperdiet tristique. Sed at odio auctor, fringilla ante sed, accumsan felis.`
  }

  const submissions: SubmissionType[] = [
    {"status": "Accepted", "language":  "Java", "memory": "15.6 MB", "runtime": "14 MS", "submittedOn": "2025-10-27 17:40"},
    {"status": "Runtime Error", "language":  "Java", "memory": "N/A", "runtime": "N/A", "submittedOn": "2025-10-23 17:40"},
    {"status": "Wrong Answer", "language":  "Java", "memory": "N/A", "runtime": "N/A", "submittedOn": "2025-10-24 17:40"},
  ]

  const leaderboard: LeaderboardType[] = [
    {"name": "Julia T.", "points":  259, "solved": 13, "runtime": "34 min"},
    {"name": "Law M.", "points":  209, "solved": 10, "runtime": "24 min"},
    {"name": "Boudour B.", "points":  109, "solved": 9, "runtime": "18 min"},
    {"name": "Alice T.", "points":  59, "solved": 3, "runtime": "8 min"},
  ]

  const comments: CommentType[] = [
    {
        senderName: "Law P",
        senderEmail: "some@email.com",
        senderPP: "some@email.com",
        liked: true,
        comment: "vufdbuhbcdihbfibv uhsdfuhsbdh uushducjbs uheds",
        replies: [],
    },
    {
        senderName: "Law P",
        senderEmail: "some@email.com",
        senderPP: "some@email.com",
        liked: true,
        comment: "vufdbuhbcdihbfibv uhsdfuhsbdh uushducjbs uheds",
        replies: [
            {
                senderName: "Law P",
                senderEmail: "some@email.com",
                senderPP: "some@email.com",
                liked: false,
                comment: "vufdbuhbcdihbfibv uhsdfuhsbdh uushducjbs uheds",
                replies: [],
            },
            {
                senderName: "Law P",
                senderEmail: "some@email.com",
                senderPP: "some@email.com",
                liked: true,
                comment: "vufdbuhbcdihbfibv uhsdfuhsbdh uushducjbs uheds",
                replies: [],
            },
        ],
    },
  ]

  const templates = getSandpackConfigs(problemName, inputVars, outputType)
  const languages = Object.keys(templates)

  // const [selectedTemp, setSelectedTemp] = useState("", null, "")
  const [selectedLang, setSelectedLang] = useStateCallback(languages[0])
  const { template, files } = templates[selectedLang]!

  // console.log(templates)
  // console.log('1')
  // console.log(templates[selectedLang])
  // console.log(`2: ${template}`)
  // console.log(files)

  const codePanelRef = useRef<ImperativePanelHandle>(null)
  const descPanelRef = useRef<ImperativePanelHandle>(null)
  const outputPanelRef = useRef<ImperativePanelHandle>(null)
  const codeAndOutputPanelRef = useRef<ImperativePanelHandle>(null)

  const [fullCode, setFullCode] = useStateCallback(false)
  const [fullOutput, setFullOutput] = useStateCallback(false)
  const [closeCode, setCloseCode] = useStateCallback(false)
  const [closeOutput, setCloseOutput] = useStateCallback(false)

  useEffect(() => {
    changePanelSizes()
  }, [fullCode, fullOutput, closeCode, closeOutput])

  const changePanelSizes = () => {
    console.log("changing sizes");
    if (!descPanelRef.current || !codeAndOutputPanelRef.current 
      || !codePanelRef.current || !outputPanelRef.current) return;

    let descSize = 50, codeAndOutputSize = 50, codeSize = 75, outputSize = 25;

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
    }

    descPanelRef.current.resize(descSize);
    codeAndOutputPanelRef.current.resize(codeAndOutputSize);
    codePanelRef.current.resize(codeSize);
    outputPanelRef.current.resize(outputSize);
  }

  return (
    <SandboxProvider data-testid="sandbox-provider"
      key="sandbox-provider" template={template} files={files}
      // className='w-[calc(100vw-var(--sidebar-width--2rem))] relative left-[calc(+0.5rem)] mr-1.5'
      className='w-[1100px] h-[725px]'
    >
      <SandboxLayout data-testid="sandbox-layout" >
        <ResizablePanelGroup
          direction="horizontal"
          className='flex flex-col w-full'
          // className="max-w-[1080px] max-h-[730px] mx-3 rounded-lg md:min-w-[450px]"
        >
          {/* Description panel */}
          <ResizablePanel data-testid="desc-area"
            defaultSize={50} ref={descPanelRef}
            className="mr-[3px] rounded-md border"
          >
            <div className='flex flex-row w-full' >
              <CodeDescArea
                problemInfo={problemInfo} submissions={submissions}
                leaderboard={leaderboard} comments={comments}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="w-[0.35px] mx-[1.5px] border-none"
            style={{ background: "transparent" }} />

          {/* Second panel */}
          <ResizablePanel data-testid="second-panel" defaultSize={50} ref={codeAndOutputPanelRef} >
            <ResizablePanelGroup direction="vertical">
              {/* Coding area panel */}
              <ResizablePanel
                defaultSize={75} ref={codePanelRef}
                className="ml-[3px] mb-1 rounded-md border"
              >
                <div data-testid="coding-area" >
                  {/* <CodingArea CodeItem={code} /> */}

                  <div className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                        border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                  >
                    <span className="text-lg font-medium" >Code</span>
                    <div className="grid grid-cols-4 gap-1">
                      {/* Size buttons */}
                      <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-gray-200" >
                        <Play size={22} color="green" />
                      </Button>
                      <Button className="w-7 shadow-none bg-muted rounded-full hover:bg-gray-200" >
                        <RotateCcw size={22} color="black" />
                      </Button>
                      <Button data-testid='code-area-fullscreen' onClick={() => {setFullCode(!fullCode) }} className="w-7 shadow-none bg-muted rounded-full hover:bg-gray-200" >
                        {!fullCode ? (<Maximize2 data-testid='code-area-max-btn' size={22} color="black" />) 
                                   : <Minimize2 data-testid='code-area-min-btn' size={22} color="black" />}
                      </Button>
                      <Button data-testid='code-area-collapse' onClick={() => {setCloseCode(!closeCode) }} className="w-7 shadow-none bg-muted rounded-full hover:bg-gray-200" >
                        {!closeCode ? (<ChevronUp data-testid='code-area-up-btn' size={22} color="black" />)
                                    : <ChevronDown data-testid='code-area-down-btn' size={22} color="black" />}
                      </Button>
                    </div>
                  </div>
                  <div className="w-full rounded-none h-12 border-b border-border/75 dark:border-border/50 py-1.5 px-2" >
                    <DropdownMenu data-testid='languageDropdown'>
                      <DropdownMenuTrigger asChild>
                        <Button data-testid='languageBtn' className="bg-background text-black text-base font-semibold hover:bg-gray-200 focus:bg-muted" >
                          {selectedLang}
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        
                      >
                        <div data-testid='languageMenu' //forceMount // forces it to stay in the DOM so it can be testable
                             className="z-10 bg-white w-26 border-1 rounded-xl"
                        >
                          {languages.map((lang) => (
                            <DropdownMenuItem  data-testid={`languageItem-${lang}`} key={lang} className="text-s font-medium p-1 m-1 hover:border-none hover:bg-primary-200"
                              onSelect={ () => {setSelectedLang(lang); //console.log(files[1]); selectedTemp(templates[lang])
                              } }
                            >
                              {lang}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* <SandboxCodeEditor showLineNumbers showInlineErrors /> */}
              </ResizablePanel>

              <ResizableHandle withHandle className='my-[0.5px] border-none h-[0.5px]'
                style={{ background: "transparent", }} />

              {/* Output panel */}
              <ResizablePanel data-testid="output-area"
                defaultSize={25} ref={outputPanelRef}
                className="ml-[3px] mt-1 rounded-md border"
              >
                <div className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                        border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                >
                  <span className="text-lg font-medium" >Output</span>
                  <div className="grid grid-cols-2 gap-1">
                    {/* Size buttons */}
                    <Button data-testid='output-area-fullscreen' onClick={() => {setFullOutput(!fullOutput) }} className="w-7 shadow-none bg-muted rounded-full hover:bg-gray-200" >
                      {!fullOutput ? (<Maximize2 data-testid='output-area-max-btn' size={22} color="black" />)
                                   : <Minimize2 data-testid='output-area-min-btn' size={22} color="black" />}
                    </Button>
                    <Button data-testid='output-area-collapse' onClick={() => {setCloseOutput(!closeOutput) }} className="w-7 shadow-none bg-muted rounded-full hover:bg-gray-200" >
                      {!closeOutput ? (<ChevronDown data-testid='output-area-down-btn' size={22} color="black" />)
                                    : <ChevronUp data-testid='output-area-up-btn' size={22} color="black" />}
                    </Button>
                  </div>
                </div>

                {/* <CodeOutputArea /> */} 
                <SandboxTabs data-testid="sandbox-tabs" >
                  <SandboxTabsContent data-testid="sandbox-tabs-content" value="preview" >
                    <SandboxPreview data-testid="sandbox-preview"
                      showOpenInCodeSandbox={true}
                      showRefreshButton={true}
                    />
                  </SandboxTabsContent>
                  <SandboxTabsContent data-testid="sandbox-tabs-content" value="console">
                    <SandboxConsole data-testid="sandbox-console" />
                  </SandboxTabsContent>
                </SandboxTabs>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SandboxLayout>
    </SandboxProvider>
  );
};

export default CodingView;