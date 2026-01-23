import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table'
import { FileText, History, Trophy } from 'lucide-react'
import { useEffect, useRef, useState, } from 'react'
import type { SubmissionType } from '../../types/SubmissionType.type'
import { Button } from '../ui/button'
import { useStateCallback } from '../helpers/UseStateCallback'
import type { BundledLanguage } from 'shiki'
import { CodeBlock, CodeBlockBody, CodeBlockItem, CodeBlockContent } from '../ui/shadcn-io/code-block'
import { CurrentLeaderboard } from '../leaderboards/CurrentLeaderboard'
import type { Question } from '@/types/questions/Question.type'
import type { TestcaseType } from '@/types/questions/Testcases.type'


const CodeDescArea = (
    { question, testcases }:
    { question: Question, testcases: TestcaseType[] }
    ) => {

    const tabs = [
        { "id": "description", "label": "Description", "icon": <FileText /> },
        { "id": "submissions", "label": "Submissions", "icon": <History /> },
        { "id": "leaderboard", "label": "Leaderboard", "icon": <Trophy /> },
    ]

    // TODO: Add the submission code

    const [activeTab, setActiveTab] = useStateCallback("description")
    const [selectedSubmission, setSelectedSubmission] = useStateCallback<SubmissionType | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useStateCallback(0)
    const [initialWidth, setInitialWidth] = useState<number | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const observer = new ResizeObserver(entries => {
            // for now, entries is guaranteed to not be empty
            if (entries.length === 0) return
            const width = entries[0].contentRect.width
            setContainerWidth(width)
            if (initialWidth === null) setInitialWidth(width)
        })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [initialWidth, setContainerWidth])

    const fullSize = containerRef.current?.offsetWidth
    let halfSize = 0, quarterSize = 0
    if (fullSize) {
        halfSize = fullSize / 2
        quarterSize = fullSize / 4
    }

    const timeDiff = (submittedOn: string) => {
        const diffMs = Date.now() - Date.parse(submittedOn)

        const seconds = Math.floor(diffMs / 1000)
        const minutes = Math.floor(diffMs / (1000 * 60))
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        let displayTime = ''
        if (days > 0) {
            displayTime = `${days} day${days > 1 ? "s" : ""} ago`
        } else if (hours > 0) {
            displayTime = `${hours} hour${hours > 1 ? "s" : ""} ago`
        } else if (minutes > 0) {
            displayTime = `${minutes} minute${minutes > 1 ? "s" : ""} ago`
        } else {
            displayTime = `${seconds} second${seconds > 1 ? "s" : ""} ago`
        }

        return displayTime
    }


    return (
        <Tabs data-testid="tabs" defaultValue='description'
            value={activeTab} onValueChange={setActiveTab} className='w-full h-full'
        >
            <TabsList data-testid="tabs-list" ref={containerRef}
                className={`w-full h-10 py-0 px-4 bg-muted rounded-none
                        border-b border-border/75 dark:border-border/50`}
            >
                {tabs.map(t => {
                    const isActive = activeTab === t.id
                    let showText = true
                    if (containerWidth < halfSize && !isActive) showText = false
                    if (containerWidth < quarterSize && isActive) showText = false

                    return <TabsTrigger data-testid="tabs-trigger" key={t.id} value={t.id}
                        className={`bg-muted rounded-none
                        hover:border-t-2 hover:border-primary/40
                        data-[state=active]:border-primary
                        data-[state=active]:text-primary
                        data-[state=active]:bg-muted
                        data-[state=active]:shadow-none
                        data-[state=active]:border-b-[2.5px]
                        data-[state=active]:border-x-0
                        data-[state=active]:border-t-0
                        dark:data-[state=active]:border-primary
                        flex items-center gap-2 transition-all
                            ${showText ? 'px-4' : 'px-2'}
                        `}
                    >
                        {t.icon}
                        {showText && t.label}
                    </TabsTrigger>
                })}
            </TabsList>

            {/* Description */}
            <TabsContent value='description' data-testid="tabs-content-description" >
                <div className='h-full p-6' >
                    <h1 className='font-bold mb-3 '>
                        {question.title}
                    </h1>

                    <p className='max-h-125 text-left leading-6 wrap-break-word whitespace-pre' >
                        {question.description}
                    </p>
                    {testcases?.map((t, idx) => {
                        return <div key={`example ${idx + 1}`} className='mt-3 flex flex-col gap-1' >
                            <p className='font-bold'>Example {idx + 1}:</p>
                            <div className='ml-4 flex flex-col gap-1' >
                                <p className='font-bold'>Inputs <span className='font-normal'>
                                    {Object.entries(t.input_data).map(([key, val], idx) => {
                                        const separator = idx < Object.keys(t.input_data).length - 1 ? `, ` : `\n`
                                        return `${key} = ${val}${separator}`
                                    })}
                                </span></p>
                                <p className='font-bold'>Outputs: <span className='font-normal'>
                                    {t.expected_output}</span>
                                </p>
                                {/* <p className='font-bold'>Explanation <span className='font-normal'>{t.explanation}</span></p> */}
                            </div>
                        </div>
                    })}
                </div>
            </TabsContent>

            {/* Submissions */}
            <TabsContent value='submissions' data-testid="tabs-content-submissions" >
                <div className='h-full p-6' >
                    {selectedSubmission === null ?
                        <Table data-testid="table" >
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Language</TableHead>
                                    <TableHead className="text-right">Memory</TableHead>
                                    <TableHead className="text-right">Runtime</TableHead>
                                </TableRow>
                            </TableHeader>

                            
                        </Table>
                        : (<div>
                            <div className='flex flex-row gap-6 items-center mb-4' >
                                <Button onClick={() => setSelectedSubmission(null)} >
                                    Back
                                </Button>
                                <h1 className='text-3xl font-semibold'
                                >
                                    {selectedSubmission.status}
                                </h1>
                            </div>
                        </div>
                        )}
                </div>
            </TabsContent>

            {/* Leaderboard */}
            <TabsContent value='leaderboard' data-testid="tabs-content-leaderboard" >
                <div className='h-full p-6' >
                    <CurrentLeaderboard />
                </div>
            </TabsContent>
        </Tabs>
    )
}

export default CodeDescArea