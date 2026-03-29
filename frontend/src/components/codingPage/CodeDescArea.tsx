import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table'
import { FileText, History, Trophy, Loader2, ClipboardCheck, Info } from 'lucide-react'
import { useEffect, forwardRef, useState, useRef } from 'react'
import { EventLeaderboard } from '@/components/leaderboards/CodingPageLeaderboard'
import type { Question, TestCase } from '@/types/questions/QuestionPagination.type'
import { useAnalytics } from '@/hooks/useAnalytics'

import RiddleUserForm from '../forms/RiddleForm'
import { getRiddleById } from '@/api/RiddlesAPI'
import type { Riddle } from '@/types/riddle/Riddle.type'
import { toast } from 'sonner'

import { TimeAgoFormat } from '../helpers/TimeAgoFormat'
import { logFrontend } from '@/api/LoggerAPI'
import type { Language } from '@/types/questions/Language.type'
import type { QuestionInstance } from '@/types/questions/QuestionInstance.type'
import type { UserQuestionInstance } from '@/types/submissions/UserQuestionInstance.type'
import type { SubmissionType } from '../../types/submissions/SubmissionType.type'
import { SubmissionSkeleton } from './SubmissionSkeleton'
import { SubmissionDetail } from './SubmissionDetail'
import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip'
import { getDiffColor } from '@/utils/difficultyBadge'

// ─── Main component ───────────────────────────────────────────────────────────

type DescProp = {
    question: Question | undefined,
    question_instance: QuestionInstance | undefined | null,
    uqi: UserQuestionInstance | undefined | null,
    testcases: TestCase[] | undefined | null,
    eventId: number | undefined,
    eventName: string | undefined,
    isCompetitionEvent: boolean,
    currentUserId?: number,
    submissionState?: 'idle' | 'loading' | 'done',
    latestSubmissionResult?: SubmissionType | null,
    allLanguages: Language[] | undefined,
    submissions: SubmissionType[] | undefined,
    onRiddleSolved?: () => void
}

// Below this pixel width the tab bar collapses to icon-only mode
const ICON_ONLY_THRESHOLD = 260

const CodeDescArea = forwardRef<HTMLDivElement, DescProp>(
({ question, question_instance, uqi, testcases, eventId, eventName, isCompetitionEvent, currentUserId,
    submissionState, latestSubmissionResult, allLanguages, submissions, onRiddleSolved
}, _codeDescAreaContainerRef) => {

    const hasEvent = eventId !== undefined

    const baseTabs = [
        { "id": "description", "label": "Description", "icon": <FileText size={16} /> },
        { "id": "submissions", "label": "Submissions", "icon": <History size={16} /> },
        { "id": "result",      "label": "Result",      "icon": <ClipboardCheck size={16} /> },
    ]

    const tabs = hasEvent
        ? [...baseTabs, { "id": "leaderboard", "label": "Leaderboard", "icon": <Trophy size={16} /> }]
        : baseTabs

    const { trackCodingTabSwitched } = useAnalytics()

    const [activeTab, setActiveTab] = useState("description")
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionType | null>(null)

    // Observe the tab bar's own width so we know when to go icon-only
    const tabsListRef = useRef<HTMLDivElement>(null)
    const [tabBarWidth, setTabBarWidth] = useState<number>(9999)

    useEffect(() => {
        const el = tabsListRef.current
        if (!el) return

        // Seed with the actual width immediately on mount
        setTabBarWidth(el.offsetWidth)

        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setTabBarWidth(entry.contentRect.width)
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, []) // stable ref — run once

    const iconOnly = tabBarWidth < ICON_ONLY_THRESHOLD

    const [riddle, setRiddle] = useState<Riddle | null>(null)
    const [isLoadingRiddle, setIsLoadingRiddle] = useState(true)

    // Auto-switch to Result tab on submission activity
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
        if (!question_instance?.riddle_id) {
            setIsLoadingRiddle(false)
            return
        }
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

    if (!question || !question_instance || !uqi) return null

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        trackCodingTabSwitched(
            question.question_id,
            tab as "description" | "submissions" | "leaderboard"
        )
    }

    const difficultyLabel = question.difficulty.replace(/^\w/, (char) => char.toUpperCase())

    //Riddle Rendering Start-----------------------------------------------
    if (question_instance?.riddle_id && !uqi?.riddle_complete) {
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
                    <div className="mb-4 flex flex-col items-center gap-2 text-center">
                        <h2 className="text-lg font-semibold">{question.question_name}</h2>
                        <span className={`text-[14px] w-fit px-2 py-1 rounded-full ${getDiffColor(question.difficulty)}`}>
                            {difficultyLabel}
                        </span>
                    </div>
                    <RiddleUserForm
                        riddle={riddle}
                        onSolved={onRiddleSolved}
                    />
                </div>
            </div>
        )
    }
    //Riddle Rendering End-------------------------------------------------

    return (
        <Tabs
            data-testid="tabs"
            defaultValue='description'
            value={activeTab}
            onValueChange={handleTabChange}
            className='w-full h-full flex flex-col'
        >
            {/*
             * Line-variant tabs:
             *   - No background pill, no press/scale animation
             *   - Active state = bottom border line only (::after pseudo-element)
             *   - When the panel is narrow (< ICON_ONLY_THRESHOLD) labels are hidden
             *     and the native `title` attribute shows on hover as a tooltip
             */}
            <TabsList
                ref={tabsListRef}
                data-testid="tabs-list"
                className="w-full h-10 shrink-0 rounded-none bg-muted
                           border-b border-border/75 dark:border-border/50
                           flex items-end px-2 gap-0 justify-start p-0"
            >
                {tabs.map(t => {
                    const isResultLoading = t.id === 'result' && submissionState === 'loading'

                    return (
                        <TabsTrigger
                            data-testid="tabs-trigger"
                            key={t.id}
                            value={t.id}
                            title={iconOnly ? t.label : undefined}
                            className={[
                                // Shape & spacing
                                'relative h-full rounded-none px-3',
                                // Layout
                                'inline-flex items-center gap-1.5',
                                // Typography
                                'text-sm font-medium',
                                // Remove ALL default Shadcn button/pill chrome
                                'bg-transparent border-0 shadow-none',
                                // No press / scale animation
                                'active:scale-100 active:bg-transparent',
                                // Colours
                                'text-muted-foreground',
                                'hover:text-foreground hover:bg-transparent',
                                // Active: text colour + bottom line via ::after
                                'data-[state=active]:bg-transparent',
                                'data-[state=active]:text-primary',
                                'data-[state=active]:shadow-none',
                                // Bottom line indicator
                                'data-[state=active]:after:absolute',
                                'data-[state=active]:after:bottom-0',
                                'data-[state=active]:after:left-0',
                                'data-[state=active]:after:right-0',
                                'data-[state=active]:after:h-[2.5px]',
                                'data-[state=active]:after:rounded-t-sm',
                                'data-[state=active]:after:bg-primary',
                                'data-[state=active]:after:content-[""]',
                                // Loading pulse on the Result tab
                                isResultLoading ? 'animate-pulse' : '',
                            ].join(' ')}
                        >
                            {t.icon}
                            {!iconOnly && <span>{t.label}</span>}
                        </TabsTrigger>
                    )
                })}
            </TabsList>

            {/* Description */}
            <TabsContent
                value='description'
                data-testid="tabs-content-description"
                className="flex-1 overflow-y-auto mt-0"
            >
                <div className='h-full p-4'>
                    <div className='border-b-2 pb-2 shrink-0'>
                        <div className='mb-3 flex flex-col items-start gap-2'>
                            <h1 className='text-2xl font-bold'>
                                {question.question_name}
                            </h1>
                            <span className={`text-[14px] w-fit px-2.5 py-1 rounded-full ${getDiffColor(question.difficulty)}`}>
                                {difficultyLabel}
                            </span>
                        </div>
                        <p className='text-left leading-6 wrap-break-word whitespace-pre-wrap overflow-y-auto max-h-100'>
                            {question.question_description}
                        </p>
                    </div>
                    <div className='max-h-60 mt-2 px-2 border rounded-xl bg-muted/65
                            wrap-break-word whitespace-pre-wrap overflow-y-auto'
                    >
                        {testcases?.map((t, idx) => {
                            return <div key={`example ${idx + 1}`} className='mt-3 flex flex-col gap-1'>
                                <p className='font-bold'>Example {idx + 1}:</p>
                                <div className='ml-4 flex flex-col gap-1'>
                                    <p className='font-bold'>Inputs <span className='font-normal'>
                                        {Object.entries(t.input_data as Record<string, unknown>).map(([key, val], i) => {
                                            const separator = i < Object.keys(t.input_data as Record<string, unknown>).length - 1 ? `, ` : `\n`
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
                </div>
            </TabsContent>

            {/* Submissions */}
            <TabsContent
                value='submissions'
                data-testid="tabs-content-submissions"
                className='flex-1 min-h-0 mt-0'
            >
                <div className='h-full p-6'>
                    {selectedSubmission && (
                        <SubmissionDetail submission={selectedSubmission} goBack={() => setSelectedSubmission(null)} />
                    )}

                    {!selectedSubmission && (!submissions || submissions?.length < 1) && (
                        <div className='flex items-center justify-center h-full text-muted-foreground'>
                            You've yet to submit anything
                        </div>
                    )}

                    {!selectedSubmission && submissions && submissions?.length > 0 && (
                        <div className="h-full flex flex-col">
                            <div className='shrink-0 inline-flex items-center'>
                                <Tooltip>
                                    <TooltipTrigger asChild className='z-9999999'>
                                        <Info size={18} />
                                    </TooltipTrigger>
                                    <TooltipContent side='top'
                                        className='z-99999999999999 p-1.5 text-sm bg-accent text-accent-foreground border rounded-3xl shadow'
                                    >
                                        Click on any submission to see more details
                                    </TooltipContent>
                                </Tooltip>
                                <Table>
                                    <TableHeader className='sticky top-0 -z-9999999'>
                                        <TableRow>
                                            <TableHead className='text-center w-40'>Status</TableHead>
                                            <TableHead className='text-center w-30'>Language</TableHead>
                                            <TableHead className="text-center w-30">Memory</TableHead>
                                            <TableHead className="text-center w-30">Runtime</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                            </div>
                            <div className='flex-1 min-h-0 overflow-y-auto'>
                                <Table>
                                    <TableBody>
                                        {submissions?.map((s, idx) => {
                                            const status_color = s.status === "Accepted" ? "text-green-500" : "text-red-500"
                                            return (
                                                <TableRow
                                                    key={`submission ${idx + 1}`}
                                                    data-testid={`submission-${idx + 1}`}
                                                    onClick={() => setSelectedSubmission(s)}
                                                >
                                                    <TableCell className='grid grid-rows-2 w-40'>
                                                        <span className={status_color}>{s.status}</span>
                                                        <span className='text-muted-foreground'>{TimeAgoFormat(new Date(s.submitted_on).toISOString())}</span>
                                                    </TableCell>
                                                    <TableCell className="w-30">
                                                        {allLanguages?.find(lang => lang.lang_judge_id === s.lang_judge_id)?.display_name}
                                                    </TableCell>
                                                    <TableCell className="text-center w-30">{s?.memory ? s.memory : "N/A"}</TableCell>
                                                    <TableCell className="text-center w-30">{s?.runtime ? s.runtime : "N/A"}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className='shrink-0'>
                                <Table>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={4} className='text-muted-foreground'>
                                                {submissions?.length} attempt{submissions?.length > 1 ? 's' : ''}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Result — live submission feedback */}
            <TabsContent
                value='result'
                data-testid="tabs-content-result"
                className="flex-1 overflow-y-auto mt-0"
            >
                <div className='h-full p-6 overflow-y-auto'>
                    {submissionState === 'loading' && <SubmissionSkeleton />}

                    {submissionState === 'done' && latestSubmissionResult && (
                        <SubmissionDetail submission={latestSubmissionResult} goBack={undefined} />
                    )}

                    {(submissionState === 'idle' || submissionState === undefined) && (
                        <div className='flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-2'>
                            <ClipboardCheck className="w-8 h-8 opacity-30" />
                            <p className="text-base">No submission yet</p>
                            <p className="text-sm">
                                Hit <span className="font-semibold text-foreground">Submit</span> to see your results here
                            </p>
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Leaderboard — only mounted when an event is active */}
            {eventId !== undefined && (
                <TabsContent
                    value='leaderboard'
                    data-testid="tabs-content-leaderboard"
                    className="flex-1 overflow-y-auto mt-0"
                >
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
})

export default CodeDescArea