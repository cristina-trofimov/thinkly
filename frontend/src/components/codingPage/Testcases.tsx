import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { X, Plus } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { useTestcases } from '../helpers/useTestcases'
import { useEffect } from 'react'


const Testcases = (
    { question_id }:
    { question_id: number }
) => {

    const { testcases, addTestcase, removeTestcase, loading,
            updateTestcase, activeTestcase, setActiveTestcase } 
        = useTestcases(question_id)

    if (loading) {
        console.log("Loading test cases")
    }

    useEffect(() => {
        if (!testcases) addTestcase()
      }, [testcases])
      

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
                <Button key="add-testcase-btn" data-testid="add-testcase-btn"
                    size={"icon"} 
                    variant={'ghost'} 
                    onClick={addTestcase}
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
                        <div key={`${key}-input-row`} className='flex flex-col gap-2' >
                            <Label data-testid={`${tc.caseID}-${key}-label`} >
                                {key}
                            </Label>
                            <Input key={key} value={`${val}`} data-testid={`${tc.caseID}-${key}-input`} 
                                onChange={(e) => { updateTestcase(tc.caseID, "input_data", e.target.value); console.log(tc.input_data) } }
                            />
                        </div>
                    ))}
                </TabsContent>
            ))}
        </Tabs>
    )
}

export default Testcases