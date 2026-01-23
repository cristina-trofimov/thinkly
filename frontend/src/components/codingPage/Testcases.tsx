import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { X, Plus } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { TestcaseType } from '@/types/questions/Testcases.type'
import { Button } from '../ui/button'


const Testcases = (
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

    if (!testcases) {
        addTestcase()
    }

    return (
        <Tabs key="all-testcase-tabs" value={activeTestcase} onValueChange={setActiveTestcase} >
            <div key="testcases-triggers" className='flex' >
                <TabsList className='w-full flex gap-2' >
                    {testcases?.map((tc) => (
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
                <Button key="add-testcase-btn" size={"icon"} variant={'ghost'} onClick={addTestcase}
                    className=" hover:text-primary"
                >
                    <Plus size={4} />
                </Button>
            </div>
            {testcases?.map((tc) => (
                <TabsContent value={tc.caseID} key={`content-${tc.caseID}`} data-testid={`content-${tc.caseID}`} 
                    className='mt-3 space-y-6'
                >
                    {Object.entries(tc.input_data).map(([key, val]) => (
                        <div className='flex flex-col gap-2' >
                            <Label >
                                {key}
                            </Label>
                            <Input key={key} value={`${val}`}
                                onChange={(e) => updateTestcase(tc.caseID, "input_data", e.target.value)}
                            />
                        </div>
                    ))}
                </TabsContent>
            ))}
        </Tabs>
    )
}

export default Testcases