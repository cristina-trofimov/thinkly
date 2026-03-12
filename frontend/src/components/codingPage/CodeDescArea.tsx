import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table'
import { FileText, History, Trophy, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SubmissionType } from '../../types/SubmissionType.type'
import { Button } from '../ui/button'
import { CurrentLeaderboard } from '../leaderboards/CurrentLeaderboard'
import type { Question } from '@/types/questions/QuestionPagination.type'
import { useTestcases } from '../helpers/useTestcases'
import { useAnalytics } from '@/hooks/useAnalytics'
import type { MostRecentSub } from '@/types/MostRecentSub.type'
import { getAllSubmissions } from '@/api/CodeSubmissionAPI'
import { getProfile } from '@/api/AuthAPI'

import RiddleUserForm from '../forms/RiddleForm'
import { getRiddleById } from '@/api/RiddlesAPI'
import type { Riddle } from '@/types/riddle/Riddle.type'
import type { QuestionInstance } from '@/types/questions/QuestionInstance.type'
import { toast } from 'sonner'

import { TimeAgoFormat } from '../helpers/TimeAgoFormat'
import { logFrontend } from '@/api/LoggerAPI'
import { getAllLanguages } from '@/api/LanguageAPI'
import type { Language } from '@/types/questions/Language.type'

const CodeDescArea = (
    { question, question_instance, mostRecentSub, }:
    { question: Question | undefined,
      question_instance: QuestionInstance | undefined | null,
      mostRecentSub: MostRecentSub | undefined
    }
) => {

    const tabs = [
        { "id": "description", "label": "Description", "icon": <FileText /> },
        { "id": "submissions", "label": "Submissions", "icon": <History /> },
        { "id": "leaderboard", "label": "Leaderboard", "icon": <Trophy /> },
    ]

    const { testcases } = useTestcases(question?.question_id)
    const { trackCodingTabSwitched } = useAnalytics()

    const [activeTab, setActiveTab] = useState("description")
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionType | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)
    const [initialWidth, setInitialWidth] = useState<number | null>(null)
    const [submissions, setSubmissions] = useState<SubmissionType[]>()

    const [hasSolvedRiddle, setHasSolvedRiddle] = useState(false)
    const [riddleObject, setRiddleObject] = useState<Riddle | null>(null)
    const [isLoadingRiddle, setIsLoadingRiddle] = useState(true)

    const [languages, setLanguages] = useState<Language[]>()

    useEffect(() => {
        if (!question?.question_id) return
        setHasSolvedRiddle(false)
        setRiddleObject(null)
        setIsLoadingRiddle(true)

        const fetchRiddle = async () => {
            try {
                const data = await getRiddleById(question_instance?.riddle_id)

                setRiddleObject(data)
            } catch (error) {
                toast.error("Failed to load riddle...")
                logFrontend({
                    level: "ERROR",
                    message: `An error occurred when loading riddle. Reason: ${error}`,
                    component: "CodeDescArea",
                    url: globalThis.location.href,
                    stack: (error as Error).stack,
                  });
                setHasSolvedRiddle(true)
            } finally {
                setIsLoadingRiddle(false)
            }
        }

        fetchRiddle()

    }, [question?.question_id, question_instance?.question_instance_id])

    useEffect(() => {
        if (hasSolvedRiddle) {
            const FetchSubmissions = async () => {
                const user = await getProfile()
                await getAllSubmissions(user.id, question_instance?.question_instance_id)
                    .then((response) => {
                        setSubmissions(response)
                    })
                await getAllLanguages(null)
                    .then((response) => {
                        setLanguages(response)
                    })
            }
            FetchSubmissions()
        }
    }, [hasSolvedRiddle, mostRecentSub])

    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(entries => {
            if (entries.length === 0) return
            const width = entries[0].contentRect.width
            setContainerWidth(width)
            if (initialWidth === null) setInitialWidth(width)
        })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [initialWidth, setContainerWidth])

    if (!question) return

    const fullSize = containerRef.current?.offsetWidth
    let halfSize = 0, quarterSize = 0
    if (fullSize) {
        halfSize = fullSize / 2
        quarterSize = fullSize / 4
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        trackCodingTabSwitched(
            question.question_id,
            tab as "description" | "submissions" | "leaderboard"
        )
    }//  Riddle Rendering ------------------------------------
    const needsRiddle = !hasSolvedRiddle;

    if (needsRiddle) {
        if (isLoadingRiddle) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-background">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading challenge lock...</p>
                </div>
            )
        }
        
        if (riddleObject) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-start p-6 pt-16 bg-background backdrop-blur-sm overflow-y-auto">

                    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-8 text-center space-y-3">
                            <p className="text-muted-foreground text-lg">
                                Solve the riddle below to reveal the description for<br /><span className="text-foreground font-semibold">{question.question_name}</span>
                            </p>
                        </div>

                        {/* Pass the entire object to the User Form */}
                        <RiddleUserForm
                            riddle={riddleObject}
                            onSolved={() => setHasSolvedRiddle(true)}
                        />
                    </div>
                </div>
            )
        }
    }
    //Riddle Rendering End-------------------------------------------------
    return (
        <Tabs data-testid="tabs" defaultValue='description'
            value={activeTab} onValueChange={handleTabChange} className='w-full h-full'
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
            <TabsContent value='description' data-testid="tabs-content-description">
                <div className='h-full p-6'>
                    <h1 className='font-bold mb-3'>
                        {question.question_name}
                    </h1>
                    <p className='max-h-125 text-left leading-6 wrap-break-word whitespace-pre'>
                        {question.question_description}
                    </p>
                    {testcases?.map((t, idx) => {
                        return <div key={`example ${idx + 1}`} className='mt-3 flex flex-col gap-1'>
                            <p className='font-bold'>Example {idx + 1}:</p>
                            <div className='ml-4 flex flex-col gap-1'>
                                <p className='font-bold'>Inputs <span className='font-normal'>
                                    {Object.entries(t.input_data).map(([key, val], idx) => {
                                        const separator = idx < Object.keys(t.input_data).length - 1 ? `, ` : `\n`
                                        return `${key} = ${JSON.stringify(val)}${separator}`
                                    })}
                                </span></p>
                                <p className='font-bold'>Outputs: <span className='font-normal'>
                                    {JSON.stringify(t.expected_output, undefined, 2)}</span>
                                </p>
                            </div>
                        </div>
                    })}
                </div>
            </TabsContent>

            {/* Submissions */}
            <TabsContent value='submissions' data-testid="tabs-content-submissions">
                <div className='h-full p-6'>
                    {selectedSubmission === null ?
                        (submissions ? (
                            <Table data-testid="table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Language</TableHead>
                                        <TableHead className="text-right">Memory</TableHead>
                                        <TableHead className="text-right">Runtime</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions?.map((s, idx) => {
                                        const status_color = s.status === "Accepted" ? "text-green-500" : "text-red-500"

                                        

                                        return <TableRow key={`submission ${idx+1}`} data-testid={`submission-${idx+1}`}
                                        onClick={() => setSelectedSubmission(s)}
                                        >
                                            <TableCell className='grid grid-rows-2' >
                                                <span className={`${status_color}`} >{s.status}</span>
                                                <span className='text-card' >{TimeAgoFormat(s.submitted_on)}</span>
                                            </TableCell>
                                            <TableCell className="" >
                                                {languages?.find(lang => lang.lang_judge_id === s.question_instance_id)?.display_name}
                                            </TableCell>
                                            <TableCell className="text-right text-card" >{s?.memory}</TableCell>
                                            </TableRow>
                                    })}
                                </TableBody>
                                <TableFooter className='mt-3' >
                                    <TableRow>
                                        <TableCell colSpan={4} className='text-card' >{submissions?.length} attempt{submissions?.length > 1 ? 's' : ''}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        )
                        : (
                            <div>You've yet to submit anything</div>
                        ))
                        : (
                            <div className='space-y-6' >
                                <div className='flex flex-col gap-3'>
                                    <div className='flex items-center gap-4 pb-4 border-b' >
                                        <Button data-testid="back-btn" size='sm' className='gap-2'
                                            onClick={() => setSelectedSubmission(null)}
                                        >
                                            ← Back
                                        </Button>
                                        <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-semibold">Submission Details</h2>
                                        <span className={`
                                            px-3 py-1 rounded-full text-sm font-medium
                                            ${selectedSubmission.status === "Accepted" 
                                                ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" 
                                                : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                            }
                                        `}>
                                            {selectedSubmission.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Submission Details Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Left Column - Basic Info */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Basic Information</h3>
                                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Runtime</span>
                                                <span className="font-mono font-medium">{selectedSubmission.runtime} ms</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Memory</span>
                                                <span className="font-mono font-medium">{selectedSubmission.memory} KB</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Submitted</span>
                                                <span className="font-mono text-sm">{TimeAgoFormat(selectedSubmission.submitted_on)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Additional Info */}
                                    {(selectedSubmission.compile_output || selectedSubmission.message) && (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Additional Information</h3>
                                            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                                {selectedSubmission.message && (
                                                    <div>
                                                        <span className="text-muted-foreground block text-sm mb-1">Message</span>
                                                        <p className="font-mono text-sm bg-background p-2 rounded border">
                                                            {selectedSubmission.message}
                                                        </p>
                                                    </div>
                                                )}
                                                {selectedSubmission.compile_output && (
                                                    <div>
                                                        <span className="text-muted-foreground block text-sm mb-1">Compile Output</span>
                                                        <pre className="font-mono text-sm bg-background p-2 rounded border overflow-x-auto">
                                                            {selectedSubmission.compile_output}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Output Section - Full Width */}
                                {(selectedSubmission.stdout || selectedSubmission.stderr) && (
                                    <div className="space-y-4 mt-4">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Program Output</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedSubmission.stdout && (
                                                <div className="bg-muted/30 rounded-lg p-4">
                                                    <span className="text-muted-foreground block text-sm mb-2">Standard Output</span>
                                                    <pre className="font-mono text-sm bg-background p-3 rounded border overflow-x-auto max-h-64">
                                                        {selectedSubmission.stdout}
                                                    </pre>
                                                </div>
                                            )}
                                            {selectedSubmission.stderr && (
                                                <div className="bg-muted/30 rounded-lg p-4">
                                                    <span className="text-muted-foreground block text-sm mb-2">Standard Error</span>
                                                    <pre className="font-mono text-sm bg-red-500/5 text-red-600 dark:text-red-400 p-3 rounded border border-red-200 dark:border-red-900 overflow-x-auto max-h-64">
                                                        {selectedSubmission.stderr}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* No Output Message */}
                                {!selectedSubmission.stdout && !selectedSubmission.stderr && !selectedSubmission.compile_output && !selectedSubmission.message && (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <p className="text-lg">No additional output available</p>
                                        <p className="text-sm mt-2">This submission didn't produce any stdout, stderr, or error messages</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Leaderboard */}
            <TabsContent value='leaderboard' data-testid="tabs-content-leaderboard">
                <div className='h-full p-6'>
                    <CurrentLeaderboard />
                </div>
            </TabsContent>
        </Tabs>
    )
}

export default CodeDescArea