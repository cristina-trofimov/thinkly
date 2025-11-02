import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import type { ProblemInfo } from '../interfaces/ProblemInfo'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table'
import { WriteComment } from '../WriteComment'
import ViewComment from '../ViewComment'
import { FileText, History, MessageCircle, Trophy } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, } from 'react'
import { motion, AnimatePresence } from "motion/react";
import type { SubmissionType } from '../interfaces/SubmissionType'
import type { LeaderboardType } from '../interfaces/LeaderboardType'
import type { CommentType } from '../interfaces/CommentType'
import { Button } from '../ui/button'
import { useStateCallback } from '../helpers/UseStateCallback'
import type { BundledLanguage } from 'shiki'
import { CodeBlock, CodeBlockBody, CodeBlockItem, CodeBlockContent } from '../ui/shadcn-io/code-block'


const CodeDescArea = (
    { problemInfo, submissions, leaderboard, comments }: 
    { problemInfo: ProblemInfo, submissions: SubmissionType[],
      leaderboard: LeaderboardType[], comments: CommentType[]
}) => {
    
    const tabs = [
        {"id": "description", "text":  "Description", "icon": <FileText />},
        {"id": "submissions", "text":  "Submissions", "icon": <History />},
        {"id": "leaderboard", "text":  "Leaderboard", "icon": <Trophy />},
        {"id": "discussion", "text":  "Discussion", "icon": <MessageCircle />},
    ]

    const code = [
        {
          language: 'jsx',
          filename: 'MyComponent.jsx',
          code: `function MyComponent(props) {
        return (
          <div>
            <h1>Hello, {props.name}!</h1>
            <p>This is an example React component.</p>
          </div>
        );
      }`,
        },
        {
          language: 'tsx',
          filename: 'MyComponent.tsx',
          code: `function MyComponent(props: { name: string }) {
        return (
          <div>
            <h1>Hello, {props.name}!</h1>
            <p>This is an example React component.</p>
          </div>
        );
      }`,
        },
      ];

    const [activeTab, setActiveTab] = useStateCallback("description")
    const [selectedSubmission, setSelectedSubmission] = useStateCallback<SubmissionType | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useStateCallback(0)

    useLayoutEffect(() => {
        const updateWidth = () => { setContainerWidth(containerRef.current?.offsetWidth || 0) }
        updateWidth();
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

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
            displayTime = `${seconds} second${seconds !== 1 ? "s" : ""} ago`
        }

        return displayTime
    }
    
  return (
    <Tabs data-testid="tabs" defaultValue='description' className='w-full' >
        <TabsList data-testid="tabs-list" //ref={containerRef}
            className={`w-full flex rounded-none h-10 bg-muted 
                        border-b border-border/75 dark:border-border/50 py-0 px-4`}
        >
            {tabs.map(t => {
                const isActive = activeTab === t.id
                let showText = true
                if (containerWidth < halfSize && !isActive) showText = false
                if (containerWidth < quarterSize && isActive) showText = false
                
                const tabRef = useRef<HTMLDivElement>(null)
                useEffect(() => {
                    if (isActive && tabRef.current) {
                        tabRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center' })
                    }
                }, [activeTab])

                return <motion.div
                        key={t.id} layout initial={false}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center justify-center overflow-hidden cursor-pointer
                            ${isActive ? 'flex-grow basis-0' : 'flex-grow-0 flex-shrink basis-auto'}`}
                        animate={{ flexGrow: isActive ? 1 : 0}}
                        transition={{
                            type: "tween",
                            stiffness: 400,
                            damping: 25
                        }}
                >
                    <TabsTrigger data-testid="tabs-trigger" value={t.id} asChild
                        className='w-full bg-muted rounded-none
                            data-[state=active]:border-primary
                            data-[state=active]:text-primary
                            data-[state=active]:bg-muted
                            data-[state=active]:shadow-none
                            data-[state=active]:border-b-[2.5px]
                            data-[state=active]:border-x-0
                            data-[state=active]:border-t-0
                            dark:data-[state=active]:border-primary
                        '
                    >
                        <motion.div
                            className={`flex items-center justify-center gap-2 w-full`}
                            animate={{ filter: 'blur(0px)' }}
                            exit={{ filter: 'blur(2px)' }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                            {t.icon}
                            <AnimatePresence initial={false}>
                            {showText && (
                                <motion.span
                                    className='font-medium'
                                    initial={{ opacity: 0, scaleX: 0.8 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    style={{ originX: 0 }}
                                >
                                    {t.text}
                                </motion.span>
                            )}
                            </AnimatePresence>
                        </motion.div>
                    </TabsTrigger>
                </motion.div>
            })}
        </TabsList>

        {/* Description */}
        <TabsContent value='description' data-testid="tabs-content-description" >
            <div className='p-6' >
                <h1 className='font-bold mb-3 '>
                    {problemInfo.title}
                </h1>
                
                <p className='max-h-[500px] text-left leading-6 break-words overflow-scroll whitespace-normal' >
                    {problemInfo.description}
                </p>
                {problemInfo.examples.map((e, idx) => {
                    return <div key={`example ${idx+1}`} className='mt-3 flex flex-col gap-1' >
                        <p className='font-bold'>Example {idx+1}:</p>
                        <div className='ml-4 flex flex-col gap-1' >
                            <p className='font-bold'>Inputs <span className='font-normal'>
                                {e.inputs.map((i, i_idx) => {
                                    return `${i.name}: ${i.type}${i_idx < e.inputs.length - 1 ? `, ` : `\n`}`
                                })}
                            </span></p>
                            <p className='font-bold'>Outputs <span className='font-normal'>
                                {e.outputs.map((o, o_idx) => {
                                    return `${o.name}: ${o.type}${o_idx < e.outputs.length - 1 ? `, ` : `\n`}`
                                })}
                            </span></p>
                            <p className='font-bold'>Expectations <span className='font-normal'>{e.expectations}</span></p>
                        </div>
                    </div>
                })}
            </div>
        </TabsContent>

        {/* Submissions */}
        <TabsContent value='submissions' data-testid="tabs-content-submissions" >
            <div className='p-6' >
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

                    <TableBody>
                        {submissions.map((s, idx) => {
                            

                            return (
                            <TableRow key={`submission ${idx}`} >
                                <TableCell className='grid grid-rows-2' onClick={() => setSelectedSubmission(s)} >
                                    <span>{s.status}</span>
                                    <span className='text-gray-500' >{timeDiff(s.submittedOn)}</span>
                                </TableCell>
                                <TableCell className="" >{s.language}</TableCell>
                                <TableCell className="text-right text-gray-500" >{s.memory}</TableCell>
                                <TableCell className="text-right text-gray-500" >{s.runtime}</TableCell>
                            </TableRow>
                            )
                        })}
                    </TableBody>

                    <TableFooter className='mt-3' >
                        <TableRow><TableCell colSpan={4} className='text-gray-500' >{submissions.length} attempt{submissions.length > 1 ? 's' : ''}</TableCell>
                        </TableRow>
                    </TableFooter>
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

                      <CodeBlock data-testid="code-block" data={code} defaultValue={code[0].language}>
                            <CodeBlockBody data-testid="code-body" >
                            {(item) => (
                                <CodeBlockItem data-testid="code-item" key={item.language} value={item.language}>
                                <CodeBlockContent data-testid="code-content" language={item.language as BundledLanguage}>
                                    {item.code}
                                </CodeBlockContent>
                                </CodeBlockItem>
                            )}
                            </CodeBlockBody>
                        </CodeBlock>
                    </div>
                  )}
            </div>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value='leaderboard' data-testid="tabs-content-leaderboard" >
            <div className='p-6' >
                <Table data-testid="table" >
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead className="text-right">Problem Solved</TableHead>
                            <TableHead className="text-right">Runtime</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {leaderboard.map((l, idx) => {
                            return <TableRow key={`rank #${idx+1}`} >
                                <TableCell className="font-medium">#{idx+1}</TableCell>
                                <TableCell className='font-semibold text-primary'>{l.name}</TableCell>
                                <TableCell className="text-right text-gray-500" >{l.points}</TableCell>
                                <TableCell className="text-right text-gray-500" >{l.solved}</TableCell>
                                <TableCell className="text-right text-gray-500" >{l.runtime}</TableCell>
                        </TableRow>
                        })}
                    </TableBody>

                    <TableFooter className='mt-3' >
                        <TableRow><TableCell colSpan={5} className='text-gray-500' >{leaderboard.length} participant{leaderboard.length > 1 ? 's' : ''}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </TabsContent>

        {/* Discussion */}
        <TabsContent value='discussion' data-testid="tabs-content-discussion" >
            <div className='p-6' >
                <WriteComment data-testid='write-comment' />
                <div className='mt-4 flex flex-col gap-2'>
                    {comments.map((c, idx) => {
                        return <div key={`comment-wrapper-${idx}`} className='flex flex-col gap-1.5'>
                            <ViewComment data-testid="view-comment" comment={c} key={`comment ${idx+1}`} />
                            {c.replies.map((r, ridx) => {
                                return <div className='ml-5 flex flex-col gap-1.5'>
                                    <ViewComment data-testid="view-comment" comment={r} key={`comment ${ridx+1}`} />
                                </div>
                            })}
                        </div>
                    })}
                </div>
            </div>
        </TabsContent>
    </Tabs>
  )
}

export default CodeDescArea