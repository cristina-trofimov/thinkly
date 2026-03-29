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
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

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

    // ── Icon-only detection ────────────────────────────────────────────────────
    //
    // WHY NOT scrollWidth > clientWidth on the TabsList?
    // The TabsList is a flex container — flex shrinks children to fit by default,
    // so scrollWidth never exceeds clientWidth and that check never fires.
    //
    // THE FIX — hidden probe element:
    // A separate div sits off-screen (position:fixed, visibility:hidden) and
    // always renders every tab label at its natural unconstrained width. It is
    // never affected by flex shrinking or overflow clipping.
    // A ResizeObserver on the real tab-list fires on every resize; we compare
    //   probeRef.offsetWidth  (space labels truly need)
    //   vs container.clientWidth  (space actually available)
    // and flip iconOnly accordingly.
    //
    // JSDOM safety: all dimensions are 0 in tests, so `probeWidth > 0` is always
    // false, iconOnly stays false, labels remain in the DOM, and every existing
    // test that clicks a tab by its text label continues to work unchanged.
    //
    // HYSTERESIS: we only re-show labels when available ≥ probeWidth + EXPAND_BUFFER
    // to avoid rapid flickering right at the boundary.

    const tabsListRef = useRef<HTMLDivElement>(null)
    const probeRef    = useRef<HTMLDivElement>(null)
    const [iconOnly, setIconOnly] = useState(false)
    const iconOnlyRef = useRef(false) // stale-closure-safe mirror of state

    const EXPAND_BUFFER = 16 // px of extra headroom required before re-expanding

    useEffect(() => {
        const container = tabsListRef.current
        if (!container) return

        const check = () => {
            const available  = container.clientWidth
            const probeWidth = probeRef.current?.offsetWidth ?? 0

            if (probeWidth === 0) return // JSDOM / not yet painted — leave as-is

            if (!iconOnlyRef.current && available < probeWidth) {
                iconOnlyRef.current = true
                setIconOnly(true)
            } else if (iconOnlyRef.current && available >= probeWidth + EXPAND_BUFFER) {
                iconOnlyRef.current = false
                setIconOnly(false)
            }
        }

        check() // seed immediately on mount / whenever tabs change

        const ro = new ResizeObserver(check)
        ro.observe(container)
        return () => ro.disconnect()
    }, [tabs.length]) // re-run when tab count changes (3 vs 4)

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
             * Probe — invisible, fixed-positioned, completely unconstrained.
             * Always renders every tab label at its natural width so we can measure
             * how much space the full tab bar truly needs regardless of panel size.
             * font-size mirrors text-sm; padding mirrors the real tab trigger px-3.
             */}
            <div
                ref={probeRef}
                aria-hidden
                style={{
                    position: 'fixed',
                    top: -9999,
                    left: -9999,
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    display: 'inline-flex',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                    padding: '0 8px',
                }}
            >
                {tabs.map(t => (
                    <div
                        key={t.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px' }}
                    >
                        {t.icon}
                        <span>{t.label}</span>
                    </div>
                ))}
            </div>

            {/*
             * Line-variant tabs:
             *   - No background pill, no press/scale animation
             *   - Active state = bottom border line only (::after pseudo-element)
             *   - Collapses to icon-only the moment the probe says labels won't fit;
             *     re-expands with a small hysteresis buffer when space returns.
             */}
            <TabsList
                ref={tabsListRef}
                data-testid="tabs-list"
                className="w-full h-10 shrink-0 rounded-none bg-muted
                           border-b border-border/75 dark:border-border/50
                           flex items-end gap-0 p-0"
            >
                {tabs.map(t => {
                    const isResultLoading = t.id === 'result' && submissionState === 'loading'

                    return (
                        <TabsTrigger
                            data-testid="tabs-trigger"
                            key={t.id}
                            value={t.id}
                            title={t.label}
                            className={[
                                // Shape & spacing
                                'relative h-full flex-1 rounded-none px-3',
                                // Layout
                                'inline-flex items-center justify-center gap-1.5',
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
            <TabsContent value='description' data-testid="tabs-content-description">
                <PanelGroup direction={'vertical'} className='h-full p-4' >
                    <div className='shrink-0 mb-3 flex flex-col items-start gap-2'>
                        <h1 className='text-2xl font-bold'>
                            {question.question_name}
                        </h1>
                        <span className={`text-[14px] w-fit px-2.5 py-1 rounded-full ${getDiffColor(question.difficulty)}`}>
                            {difficultyLabel}
                        </span>
                    </div>
                    <Panel defaultSize={75}
                        className='max-h-full text-left leading-6 wrap-break-word whitespace-pre-wrap overflow-y-auto'
                    >
                        {question.question_description}
                    </Panel>
                    <PanelResizeHandle data-testid="panel-resizable-handle"
                        className='my-0.5 h-0.5 bg-primary/35 rounded-full'
                    />
                    <Panel defaultSize={25}
                        className='my-2 px-2 border rounded-xl bg-muted/65
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
                    </Panel>
                </PanelGroup>
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