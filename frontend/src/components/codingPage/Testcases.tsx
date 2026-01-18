import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { X, Plus } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { TestcaseType } from '@/types/questions/Testcases.type'
import { useState } from 'react'
import { Button } from '../ui/button'

const Testcases = () => {
    const [testcases, setTestcases] = useState<TestcaseType[]>([
        {
            id: "",
            caseID: "Case 1",
            inputs: "",
            output: ""
        }
    ]);
    const [activeTestcase, setActiveTestcase] = useState<string>(testcases[0].caseID);
    
    const addTestcase = () => {
        const newCase: TestcaseType = {
            id: '',
            caseID: `Case ${testcases.length + 1}`,
            inputs: "",
            output: "",
        }
        setTestcases((prev) => [...prev, newCase])
        setActiveTestcase(newCase.caseID)
    }
    
    const removeTestcase = (caseID: string) => {
        if (testcases.length === 1) return
    
        const filtered = testcases.filter((c) => c.caseID !== caseID)
        let idx = -1
    
        testcases.map((c) => {
            if (c.caseID === caseID) {
                idx = testcases.indexOf(c)
            }
        })
    
        for (let i = idx; i < filtered.length; i++) {
            filtered[i].caseID = `Case ${i + 1}`
        }
    
        setTestcases(filtered)
    
        const newID = (activeTestcase === caseID && idx !== 0) ? idx : idx - 1
        // TODO: happens regardless of active testcase tab => onValueChange on Tablist
        // setActiveTestcase(testcases[newID].caseID)
        setActiveTestcase(testcases[newID].caseID)
    }
    
    const updateTestcase = (
        caseID: string,
        field: "inputs" | "output",
        value: string
    ) => {
        setTestcases((prev) =>
            prev.map((c) =>
                c.caseID === caseID ? { ...c, [field]: value } : c
            )
        )
    }

    return (
        <Tabs data-testid="testcases-tab" value={activeTestcase} onValueChange={setActiveTestcase} >
            <div className='flex ' >
                <TabsList className='w-full flex gap-2' >
                    {testcases && testcases.map((c) => (
                        // let caseNum = idx + 1
                        <div className='relative inline-flex rounded-sm
                            hover:border-t-2 hover:border-primary/40 hover:bg-muted
                            data-[state=active]:border-primary
                            data-[state=active]:shadow-none
                            data-[state=active]:border-b-[2.5px]
                            data-[state=active]:border-x-0
                            data-[state=active]:border-t-0
                            dark:data-[state=active]:border-primary'
                        >
                            <TabsTrigger value={c.caseID} key={`trigger-${c.caseID}`} data-testid={`trigger-${c.caseID}`}
                                className='rounded-sm p-2 flex items-center
                                data-[state=active]:text-primary
                                transition-all'
                            >
                                {c.caseID}
                            </TabsTrigger>
                            <X size={16} onClick={() => removeTestcase(c.caseID)}
                                className='absolute -top-1.5 -right-1
                                    bg-muted hover:text-red-700 rounded-full'
                            />
                        </div>
                    ))}
                </TabsList>
                <Button size={"icon"} variant={'ghost'} onClick={addTestcase}
                    className=" hover:text-primary"
                >
                    <Plus size={4} />
                </Button>
            </div>
            {testcases && testcases.map((c) => (
                <TabsContent value={c.caseID} key={`content-${c.caseID}`} data-testid={`content-${c.caseID}`} 
                    className='mt-3 space-y-6'
                >
                    <div className='space-y-2' >
                        <Label>Input(s)</Label>
                        <Input value={c.inputs}
                            onChange={(e) => updateTestcase(c.caseID, "inputs", e.target.value)}
                        />
                    </div>
                    <div className='space-y-2' >
                        <Label>Expected output</Label>
                        <Input  />
                        <Input value={c.output}
                            onChange={(e) => updateTestcase(c.caseID, "output", e.target.value)}
                        />
                    </div>
                </TabsContent>
            ))}
        </Tabs>
    )
}

export default Testcases