import { useEffect, useRef } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";
import { SandboxCodeEditor, SandboxConsole, SandboxLayout, SandboxProvider,
          SandboxTabs, SandboxTabsContent } from "./ui/shadcn-io/sandbox";
import CodingArea from "./CodingArea";
import CodeDescArea from "./CodeDescArea";
import CodeOutputArea from "./CodeOutputArea";
import { Play, RotateCcw, Maximize2, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useState } from "react";
import { getSandpackConfigs } from "./helpers/SandpackConfig";
import type { ImperativePanelHandle } from 'react-resizable-panels';


// function useStateCallback(intialState) {
//   const [state, setState] = React.useState(intialState)
//   const cbRef = React.useRef(null)

// }

const CodingView = () => {
// const CodingView = ({problemName, inputVars, outputType}: ) => {
  const problemName = "problemName"
  const inputVars = [{name: "test", type: "int"}, {name: "me", type: "string"}]
  const outputType = "int"

  const templates = getSandpackConfigs(problemName, inputVars, outputType)
  const languages = Object.keys(templates)

  // const [selectedTemp, setSelectedTemp] = useState("", null, "")
  const [selectedLang, setSelectedLang] = useState(languages[0])
  const { template, files } = templates[selectedLang]!

  // console.log(templates)
  // console.log(`1: ${templates[selectedLang]}`)
  // console.log(`2: ${template}`)
  // console.log(files)

  const codePanelRef = useRef<ImperativePanelHandle>(null)
  const descPanelRef = useRef<ImperativePanelHandle>(null)
  const outputPanelRef = useRef<ImperativePanelHandle>(null)
  const codeAndOutputPanelRef = useRef<ImperativePanelHandle>(null)

  const [fullCode, setFullCode] = useState(false)
  const [fullDesc, setFullDesc] = useState(false)
  const [fullOutput, setFullOutput] = useState(false)

  useEffect(() => {
    changePanelSizes()
  }, [fullCode, fullDesc, fullOutput])

  const changePanelSizes = () => {
    console.log("changing sizes")
    console.log(fullCode)

    if (fullCode) {
      console.log("inside full code")

      descPanelRef.current?.resize(0)
      codeAndOutputPanelRef.current?.resize(750)
      codePanelRef.current?.resize(750)
      outputPanelRef.current?.resize(0)
    } else if (fullDesc) {
      descPanelRef.current?.resize(750)
      codeAndOutputPanelRef.current?.resize(0)
      codePanelRef.current?.resize(0)
      outputPanelRef.current?.resize(0)
    } else if (fullOutput) {
      descPanelRef.current?.resize(0)
      codeAndOutputPanelRef.current?.resize(750)
      codePanelRef.current?.resize(0)
      outputPanelRef.current?.resize(750)
    } else {
      console.log("inside else stmt")

      descPanelRef.current?.resize(350)
      codeAndOutputPanelRef.current?.resize(350)
      codePanelRef.current?.resize(75)
      outputPanelRef.current?.resize(40)
    }
  }
  
  return (
    <SandboxProvider key={selectedLang} template={template} files={files} >
      <SandboxLayout>
        <ResizablePanelGroup
          direction="horizontal"
          className="max-w-full max-h-full rounded-lg md:min-w-[450px]"
        >
          {/* Description panel */}
          <ResizablePanel
            defaultSize={350} ref={descPanelRef}
            //minSize={15}
            className="mr-[3px] rounded-md border"
          >
            <CodeDescArea />
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="w-0.5 mx-[2px]"
            style={{
              border: "none",
              background: "transparent",
            }}
          />

          {/* Coding area panel */}
          <ResizablePanel defaultSize={350} ref={codeAndOutputPanelRef} //minSize={50}
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                defaultSize={75} ref={codePanelRef}
                className="ml-[3px] mb-1 rounded-md border"
              >
                  {/* <CodingArea CodeItem={code} /> */}

                  <div className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                        border-b border-border/75 dark:border-border/50 py-1.5 px-4"
                  >
                      <span className="text-lg font-medium" >Code</span>
                      <div className="grid grid-cols-3 gap-0.5">
                          {/* Size buttons */}
                          <Button className="shadow-none bg-muted rounded-full hover:bg-gray-200" >
                              <Play size={22} color="green" />
                          </Button>
                          <Button className="shadow-none bg-muted rounded-full hover:bg-gray-200" >
                              <RotateCcw size={22} color="black" />
                          </Button>
                          <Button onClick={() => {setFullCode(!fullCode) }} className="shadow-none bg-muted rounded-full hover:bg-gray-200" >
                              <Maximize2 size={22} color="black" />
                          </Button>
                      </div>
                  </div>
                  <div className="w-full rounded-none h-12 border-b border-border/75 dark:border-border/50 py-1.5 px-2" >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-background text-black text-base font-semibold hover:bg-gray-200 focus:bg-muted" >
                          {selectedLang}
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="z-10 bg-white w-26 border-1 rounded-xl" >
                        {languages.map((lang) => (
                          <DropdownMenuItem key={lang} className="text-s font-medium p-1 m-1 hover:border-none hover:bg-purple-200"
                            onSelect={ () => {setSelectedLang(lang); //console.log(files[1]); selectedTemp(templates[lang])
                            } }
                          >
                            {lang}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <SandboxCodeEditor showLineNumbers showInlineErrors />
              </ResizablePanel>

              <ResizableHandle
                withHandle
                style={{
                  border: "none",
                  background: "transparent",
                  height: "2px", //, marginTop: "2.5px", marginBottom: "2.5px"
                }}
              />

              {/* Output panel */}
              <ResizablePanel
                defaultSize={40} ref={outputPanelRef}
                className="ml-[3px] mt-1 rounded-md border"
              >
                {/* <CodeOutputArea /> */}
                <SandboxTabs>
                  <SandboxTabsContent value="console">
                    <SandboxConsole />
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
