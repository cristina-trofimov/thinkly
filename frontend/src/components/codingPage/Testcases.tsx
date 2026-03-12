import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { X, Plus } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { useTestcases } from '../helpers/useTestcases'
import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type { TestCase } from '@/types/questions/QuestionPagination.type'


const Testcases = (
    { question_id }:
    { question_id: number | undefined }
) => {
    const {
        testcases, addTestcase, removeTestcase,
        updateTestcase, activeTestcase, setActiveTestcase
    } = useTestcases(question_id)

    const { trackTestcaseAdded, trackTestcaseRemoved } = useAnalytics()

    useEffect(() => {
        if (!question_id) return
        if (!testcases) addTestcase()
    }, [testcases]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!question_id) return null

    const handleAddTestcase = () => {
        addTestcase()
        trackTestcaseAdded(question_id)
    }

    const handleRemoveTestcase = (tc: TestCase) => {
        removeTestcase(tc)
        trackTestcaseRemoved(question_id)
    }

    return (
        <Tabs key="all-testcase-tabs" value={activeTestcase} onValueChange={setActiveTestcase}
        >
            <div key="testcases-triggers" className='flex'>
                <TabsList className='w-full flex gap-2'>
                    {testcases?.map((tc, idx) => (
                        <TabsTrigger value={`Case ${idx+1}`} key={`trigger-case-${idx+1}`} data-testid={`trigger-case-${idx+1}`}
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
                            {`Case ${idx + 1}`}
                            <X size={16}
                                onClick={() => handleRemoveTestcase(tc)}
                                className='hover:text-red-700 rounded-full'
                            />
                        </TabsTrigger>
                    ))}
                </TabsList>
                <Button key="add-testcase-btn" data-testid="add-testcase-btn"
                    size={"icon"}
                    variant={'ghost'}
                    onClick={handleAddTestcase}
                    className="hover:text-primary"
                >
                    <Plus size={4} />
                </Button>
            </div>
            {testcases?.map((tc, idx) => (
                <TabsContent value={`Case ${idx+1}`} key={`content-${idx+1}`} data-testid={`content-${idx+1}`}
                    className='mt-3 space-y-6'
                >
                    {Object.entries(tc.input_data).map(([key, val]) => (
                        <div key={`${key}-input-row`} className='flex flex-col gap-2'>
                            <Label data-testid={`Case-${idx+1}-${key}-label`}>
                                {key}
                            </Label>
                            <Input key={key} value={`${val}`} data-testid={`Case-${idx+1}-${key}-input`}
                                onChange={(e) => { updateTestcase(tc, "input_data", e.target.value) }}
                            />
                        </div>
                    ))}
                </TabsContent>
            ))}
        </Tabs>
    )
}

export default Testcases