import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table'
import { FileText, History, Trophy, Loader2, ClipboardCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EventLeaderboard } from '@/components/leaderboards/CodingPageLeaderboard'
import type { Question, TestCase } from '@/types/questions/QuestionPagination.type'
import { useAnalytics } from '@/hooks/useAnalytics'
import { getAllSubmissions } from '@/api/SubmissionAPI'

import RiddleUserForm from '../forms/RiddleForm'
import { getRiddleById } from '@/api/RiddlesAPI'
import type { Riddle } from '@/types/riddle/Riddle.type'
import { toast } from 'sonner'

import { TimeAgoFormat } from '../helpers/TimeAgoFormat'
import { logFrontend } from '@/api/LoggerAPI'
import { getAllLanguages } from '@/api/LanguageAPI'
import { useCodingHooks } from '../helpers/CodingHooks'
import type { Language } from '@/types/questions/Language.type'
import SubmissionDetail from './SubmissionDetail'
import { putUserInstance } from '@/api/UserQuestionInstanceAPI'
import type { QuestionInstance } from '@/types/questions/QuestionInstance.type'
import type { UserQuestionInstance } from '@/types/submissions/UserQuestionInstance.type'
import type { SubmissionType } from '../../types/submissions/SubmissionType.type'
import { SubmissionResult, SubmissionResultSkeleton } from './SubmissionResult'

// ─── Main component ───────────────────────────────────────────────────────────

const CodeDescArea = (
    { question, question_instance, uqi, testcases, eventId, eventName, isCompetitionEvent, currentUserId,
        submissionState, latestSubmissionResult }:
        {
            question: Question | undefined,
            question_instance: QuestionInstance | undefined | null,
            uqi: UserQuestionInstance | undefined | null,
            testcases: TestCase[] | undefined | null,
            /** The ID of the active competition/event, if the question was opened from one. */
            eventId: number | undefined,
            /** The display name of the active event. */
            eventName: string | undefined,
            /** True when the event is a Competition, false when AlgoTime. Ignored when eventId is undefined. */
            isCompetitionEvent: boolean,
            currentUserId?: number,
            /** Driven by the parent when the user hits Submit. */
            submissionState?: 'idle' | 'loading' | 'done',
            /** The latest submission returned by the API once submissionState === 'done'. */
            latestSubmissionResult?: SubmissionType | null,
        }
) => {

    const hasEvent = eventId !== undefined

    const baseTabs = [
        { "id": "description", "label": "Description", "icon": <FileText /> },
        { "id": "submissions", "label": "Submissions", "icon": <History /> },
        { "id": "result", "label": "Result", "icon": <ClipboardCheck /> },
    ]

    // Only expose the Leaderboard tab when the question belongs to an event
    const tabs = hasEvent
        ? [...baseTabs, { "id": "leaderboard", "label": "Leaderboard", "icon": <Trophy /> }]
        : baseTabs

    const { setUserQuestionInstance } = useCodingHooks(question)

    const { trackCodingTabSwitched } = useAnalytics()

    const [activeTab, setActiveTab] = useState("description")
    const [allLanguages, setAllLanguages,] = useState<Language[] | null>(null)
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionType | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)
    const [initialWidth, setInitialWidth] = useState<number | null>(null)
    const [submissions, setSubmissions] = useState<SubmissionType[]>()

    const [riddle, setRiddle] = useState<Riddle | null>(null)
    const [isLoadingRiddle, setIsLoadingRiddle] = useState(true)

    // Auto-switch to the Result tab whenever a submission starts or finishes
    useEffect(() => {
        if (submissionState === 'loading' || submissionState === 'done') {
            setActiveTab('result')
        }
    }, [submissionState])

    useEffect(() => {
        if (!hasEvent && activeTab === "leaderboard") {
            setActiveTab("description")
        }
    }, [hasEvent, activeTab])

    useEffect(() => {
        // No riddle on this question — skip fetch entirely and clear loading state
        if (!question_instance?.riddle_id) {
            setIsLoadingRiddle(false)
            return
        }
        // Riddle already solved — no need to re-fetch
        if (uqi?.riddle_complete) {
            setIsLoadingRiddle(false)
            return
        }

        const fetchRiddle = async () => {
            try {
                await getRiddleById(question_instance.riddle_id)
                    .then((resp) => setRiddle(resp))
            } catch (error) {
                toast.error("Failed to load riddle...")
                logFrontend({
                    level: "ERROR",
                    message: `An error occurred when loading riddle. Reason: ${error}`,
                    component: "CodeDescArea",
                    url: globalThis.location.href,
                    stack: (error as Error).stack,
                })
            } finally {
                setIsLoadingRiddle(false)
            }
        }
        fetchRiddle()
    }, [question_instance, uqi?.riddle_complete])

    useEffect(() => {
        if (uqi?.user_question_instance_id) {
            const FetchSubmissions = async () => {
                const [subs, langs] = await Promise.all([
                    getAllSubmissions(uqi?.user_question_instance_id),
                    getAllLanguages(null)
                ])

                setSubmissions(subs)
                setAllLanguages(langs)
            }
            FetchSubmissions()
        }
    }, [uqi])

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

    if (!question || !question_instance || !uqi) return

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
    }

    if (question_instance?.riddle_id && !uqi?.riddle_complete) { // Needs to solve riddle
        if (isLoadingRiddle || !riddle) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-background">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading challenge lock...</p>
                </div>
            )
        }
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-background">
                <div className="w-full max-w-md">
                    <h2 className="text-lg font-semibold mb-4 text-center">{question.question_name}</h2>
                    <RiddleUserForm
                        riddle={riddle}
                        onSolved={async () => {
                            const updated = { ...uqi, riddle_complete: true }
                            await putUserInstance(updated)
                                .then((resp) => setUserQuestionInstance(resp))
                        }}
                    />
                </div>
            </div>
        )
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

                    // Pulse the Result tab trigger while a submission is in flight
                    const isResultLoading = t.id === 'result' && submissionState === 'loading'

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
                            ${isResultLoading ? 'animate-pulse' : ''}
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
                    <p className='text-left leading-6 break-words whitespace-pre-wrap overflow-y-auto max-h-96'>
                        {question.question_description}
                    </p>
                    {testcases?.map((t, idx) => {
                        return <div key={`example ${idx + 1}`} className='mt-3 flex flex-col gap-1'>
                            <p className='font-bold'>Example {idx + 1}:</p>
                            <div className='ml-4 flex flex-col gap-1'>
                                <p className='font-bold'>Inputs <span className='font-normal'>
                                    {Object.entries(t.input_data as Record<string, unknown>).map(([key, val], idx) => {
                                        const separator = idx < Object.keys(t.input_data as Record<string, unknown>).length - 1 ? `, ` : `\n`
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
                    {selectedSubmission && (
                        <SubmissionDetail selectedSubmission={selectedSubmission} goBack={() => setSelectedSubmission(null)} />
                    )}

                    {!selectedSubmission && (!submissions || submissions?.length < 1) && (
                        <div className='flex items-center justify-center h-full text-muted-foreground'>
                            You've yet to submit anything
                        </div>)}

                    {!selectedSubmission && submissions && submissions?.length > 0 && (
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

                                    return <TableRow key={`submission ${idx + 1}`} data-testid={`submission-${idx + 1}`}
                                        onClick={() => setSelectedSubmission(s)}
                                    >
                                        <TableCell className='grid grid-rows-2' >
                                            <span className={`${status_color}`} >{s.status}</span>
                                            <span className='text-card' >{TimeAgoFormat(new Date(s.submitted_on).toISOString())}</span>
                                        </TableCell>
                                        <TableCell className="" >
                                            {allLanguages?.find(lang => lang.lang_judge_id === s.lang_judge_id)?.display_name}
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
                    )}
                </div>
            </TabsContent>

            {/* Result — live submission feedback */}
            <TabsContent value='result' data-testid="tabs-content-result">
                <div className='h-full p-6 overflow-y-auto'>
                    {submissionState === 'loading' && <SubmissionResultSkeleton />}

                    {submissionState === 'done' && latestSubmissionResult && (
                        <SubmissionResult result={latestSubmissionResult} />
                    )}

                    {(submissionState === 'idle' || submissionState === undefined) && (
                        <div className='flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-2'>
                            <ClipboardCheck className="w-8 h-8 opacity-30" />
                            <p className="text-base">No submission yet</p>
                            <p className="text-sm">Hit <span className="font-semibold text-foreground">Submit</span> to see your results here</p>
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Leaderboard — only mounted when an event is active */}
            {eventId !== undefined && (
                <TabsContent value='leaderboard' data-testid="tabs-content-leaderboard">
                    <div className='h-full p-6'>
                        <EventLeaderboard
                            eventId={eventId}
                            eventName={eventName ?? ""}
                            isCompetitionEvent={isCompetitionEvent}
                            currentUserId={currentUserId}
                        />
                    </div>
                </TabsContent>
            )}
        </Tabs>
    )
}

export default CodeDescArea