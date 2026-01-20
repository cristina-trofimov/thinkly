import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { X, Plus } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { TestcaseType } from '@/types/questions/Testcases.type'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { useTestcases } from '../helpers/useTestcases'


const Testcases = (
    // { cases }:
    // { cases: TestcaseType[] }
    {
        testcases, activeTestcase, setActiveTestcase,
        addTestcase, removeTestcase, updateTestcase
    }:
    {
        testcases: TestcaseType[],
        activeTestcase: string,
        setActiveTestcase: (value: string) => void,
        addTestcase: () => void,
        removeTestcase: (caseID: string) => void,
        updateTestcase: (
            caseID: string,
            field: "input_data" | "expected_output",
            value: string
        ) => void,
    }
) => {
    

    // const [testcases, setTestcases] = useState<TestcaseType[]>(cases);
    // const [testcases, setTestcases] = useState<TestcaseType[]>([
    //     {
    //         test_case_id: -1,
    //         question_id: -1,
    //         caseID: "Case 1",
    //         input_data: "",
    //         expected_output: ""
    //     }
    // ]);
    // const [activeTestcase, setActiveTestcase] = useState<string>(testcases[0].caseID);
    
    // useEffect(() => {
    //     setTestcases(cases);
    // }, [cases]);

    // const addTestcase = () => {
    //     const newCase: TestcaseType = {
    //         test_case_id: -1,
    //         question_id: -1,
    //         caseID: `Case ${testcases.length + 1}`,
    //         input_data: "",
    //         expected_output: "",
    //     }
    //     setTestcases((prev) => [...prev, newCase])
    //     setActiveTestcase(newCase.caseID)
    // }
    
    // const removeTestcase = (caseID: string) => {
    //     if (testcases.length === 1) return
    
    //     const filtered = testcases.filter((c) => c.caseID !== caseID)
    //     let idx = -1
    
    //     testcases.map((c) => {
    //         if (c.caseID === caseID) {
    //             idx = testcases.indexOf(c)
    //         }
    //     })
    
    //     for (let i = idx; i < filtered.length; i++) {
    //         filtered[i].caseID = `Case ${i + 1}`
    //     }
    
    //     setTestcases(filtered)
    
    //     const newID = (activeTestcase === caseID && idx !== 0) ? idx : idx - 1
    //     // TODO: happens regardless of active testcase tab => onValueChange on Tablist
    //     // setActiveTestcase(testcases[newID].caseID)
    //     setActiveTestcase(testcases[newID].caseID)
    // }
    
    // const updateTestcase = (
    //     caseID: string,
    //     field: "input_data" | "expected_output",
    //     value: string
    // ) => {
    //     setTestcases((prev) =>
    //         prev.map((c) =>
    //             c.caseID === caseID ? { ...c, [field]: value } : c
    //         )
    //     )
    // }

    return (
        <Tabs value={activeTestcase} onValueChange={setActiveTestcase} >
            <div className='flex ' >
                <TabsList className='w-full flex gap-2' >
                    {testcases?.map((tc) => (
                        // let caseNum = idx + 1

                        <TabsTrigger value={tc?.caseID} key={`trigger-${tc?.caseID}`} data-testid={`trigger-${tc?.caseID}`}
                            className='rounded-sm p-2 flex items-center gap-1
                            data-[state=active]:text-primary
                            hover:border-t-2 hover:border-primary/40 hover:bg-muted
                            data-[state=active]:border-primary
                            data-[state=active]:shadow-none
                            data-[state=active]:border-b-[2.5px]
                            data-[state=active]:border-x-0
                            data-[state=active]:border-t-0
                            dark:data-[state=active]:border-primary
                            transition-all'
                        >
                            {tc?.caseID}
                            <X size={16} onClick={() => removeTestcase(tc?.caseID)}
                                className='hover:text-red-700 rounded-full'
                            />
                        </TabsTrigger>
                    ))}
                </TabsList>
                <Button size={"icon"} variant={'ghost'} onClick={addTestcase}
                    className=" hover:text-primary"
                >
                    <Plus size={4} />
                </Button>
            </div>
            {testcases?.map((tc) => (
                <TabsContent value={tc.caseID} key={`content-${tc.caseID}`} data-testid={`content-${tc.caseID}`} 
                    className='mt-3 space-y-6'
                >
                    <div className='space-y-2' >
                        <Label>Input(s)</Label>
                        {/* {c.input_data.map((input) => {
                            // 
                        })} */}
                        {/* <Input value={c.input_data}
                            onChange={(e) => updateTestcase(c.caseID, "input_data", e.target.value)}
                        /> */}
                    </div>
                    <div className='space-y-2' >
                        <Label>Expected output</Label>
                        <Input value={tc.expected_output}
                            onChange={(e) => updateTestcase(tc.caseID, "expected_output", e.target.value)}
                        />
                    </div>
                </TabsContent>
            ))}
        </Tabs>
    )
}

export default Testcases