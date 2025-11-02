import React from 'react'
import { SandboxTabsContent, SandboxConsole } from '../ui/shadcn-io/sandbox'

const CodeOutputArea = () => {
  return (
    <SandboxConsole />
    // <SandboxTabsContent value="console">
    //   <SandboxConsole />
    // </SandboxTabsContent>
  )
}

export default CodeOutputArea