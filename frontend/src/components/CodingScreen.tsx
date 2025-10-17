import React from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable'

const CodingScreen = () => {
    return (
        <ResizablePanelGroup
          direction="horizontal"
          className="max-w-full max-h-full rounded-lg md:min-w-[450px]"
        >
          <ResizablePanel defaultSize={350} minSize={15} className='mr-[3px] rounded-md border' >
            <div className="flex h-[750px] items-center justify-center p-6">
              <span className="font-semibold">One</span>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className='w-0.5 mx-[2px]'
            style={{
                border: 'none', background: 'transparent'
              }}
          />
          
          <ResizablePanel defaultSize={350} minSize={50} >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={75} className='ml-[3px] mb-1 rounded-md border' >
                <div className="flex h-full items-center justify-center p-6">
                  <span className="font-semibold">Two</span>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle
                    style={{
                        border: 'none', background: 'transparent', 
                        height: "2px"//, marginTop: "2.5px", marginBottom: "2.5px"
                    }}
                />
              
              <ResizablePanel defaultSize={25} className='ml-[3px] mt-1 rounded-md border' >
                <div className="flex h-full items-center justify-center p-6">
                  <span className="font-semibold">Three</span>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      )
}

export default CodingScreen