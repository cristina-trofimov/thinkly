import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import type { ProblemInfo } from './interfaces/ProblemInfo'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table'
import { WriteComment } from './WriteComment'
import ViewComment from './ViewComment'
import { FileText, History, MessageCircle, Trophy } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from "motion/react";


// const CodeDescArea = (problem: ProblemInfo) => {
const CodeDescArea = () => {

    const tabs = [
        {"id": "description", "text":  "Description", "icon": <FileText />},
        {"id": "submissions", "text":  "Submissions", "icon": <History />},
        {"id": "leaderboard", "text":  "Leaderboard", "icon": <Trophy />},
        {"id": "discussion", "text":  "Discussion", "icon": <MessageCircle />},
    ]

    const submissions = [
        {"status": "Accepted", "language":  "Java", "memory": "15.6 MB", "runtime": "14 MS", "submittedOn": "2025-10-27 17:40"},
        {"status": "Runtime Error", "language":  "Java", "memory": "N/A", "runtime": "N/A", "submittedOn": "2025-10-23 17:40"},
        {"status": "Wrong Answer", "language":  "Java", "memory": "N/A", "runtime": "N/A", "submittedOn": "2025-10-24 17:40"},
    ]

    const leaderboard = [
        {"name": "Julia T.", "points":  259, "solved": 13, "runtime": "34 min"},
        {"name": "Law M.", "points":  209, "solved": 10, "runtime": "24 min"},
        {"name": "Boudour B.", "points":  109, "solved": 9, "runtime": "18 min"},
        {"name": "Alice T.", "points":  59, "solved": 3, "runtime": "8 min"},
    ]

    const [activeTab, setActiveTab] = useState("description")
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)

    useLayoutEffect(() => {
        const updateWidth = () => {
            setContainerWidth(containerRef.current?.offsetWidth || 0)
        }
        updateWidth();
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    const fullSize = window.innerWidth
    const halfSize = fullSize / 2
    const quarterSize = fullSize / 4
    
  return (
    <Tabs defaultValue='description' >
        <TabsList ref={containerRef}
            className="w-full relative justify-between rounded-none h-10 bg-muted 
                        border-b border-border/75 dark:border-border/50 py-0 px-4"
            
            // activeClassName="rounded-none shadow-none bg-transparent after:content-[''] after:absolute after:inset-x-0 after:h-0.5 after:bottom-0 dark:after:bg-white after:bg-black after:rounded-t-full"
        >
            {tabs.map(t => {
                const isActive = activeTab == t.id
                let showText = true
                if (containerWidth < halfSize && !isActive) showText = false
                if (containerWidth < quarterSize && isActive) showText = false
                
                return <TabsTrigger value={t.id}
                    className='bg-muted rounded-none
                            data-[state=active]:border-purple-700
                            data-[state=active]:text-purple-700
                            data-[state=active]:bg-muted
                            data-[state=active]:shadow-none
                            data-[state=active]:border-b-[2.5px]
                            data-[state=active]:border-x-0
                            data-[state=active]:border-t-0
                            dark:data-[state=active]:border-purple-700
                            '
                >
                    {t.icon}{t.text}
                </TabsTrigger>
            })}
        </TabsList>

        {/* Description */}
        <TabsContent value='description' >
            <div className="h-[750px] p-6">
                <h1 className='font-bold mb-3 '>
                    Title
                </h1>
                
                <p className='text-justify' >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nec diam ac mauris venenatis dapibus eget non urna. In hac habitasse platea dictumst. Nunc hendrerit vestibulum sodales. Sed gravida a lacus quis luctus. Duis at lorem sit amet massa accumsan tempus eu et eros. Nam ullamcorper, ligula in varius pellentesque, enim ex facilisis eros, sit amet lacinia ex est sit amet nulla. Praesent congue vehicula tellus ullamcorper pretium. Aenean imperdiet risus quis felis dictum vestibulum. Donec et leo ultrices, pellentesque diam id, volutpat metus. Suspendisse ultrices nisi eget ipsum commodo, non posuere velit dignissim. Aenean id mi a nisi sagittis pellentesque non nec libero. Proin et orci erat. Quisque consectetur consequat tincidunt. Ut vulputate sem in nisl laoreet feugiat.

                    Ut efficitur metus vel nisl hendrerit laoreet. Donec ultrices hendrerit tincidunt. Nam felis elit, aliquam id mattis ac, pellentesque at libero. Duis faucibus vitae urna et rhoncus. In a neque velit. Aenean quis ultrices mi. In fringilla libero a lectus imperdiet tristique. Sed at odio auctor, fringilla ante sed, accumsan felis.
                </p>
                <div className='mt-3 flex flex-col gap-1' >
                    <p className='font-bold'>Example <span className='font-normal'>"number"</span></p>
                    <div className='ml-4 flex flex-col gap-1' >
                        <p className='font-bold'>Inputs <span className='font-normal'>"number"</span></p>
                        <p className='font-bold'>Outputs <span className='font-normal'>"number"</span></p>
                        <p className='font-bold'>Exapectations <span className='font-normal'>"number"</span></p>
                    </div>
                </div>
            </div>
        </TabsContent>

        {/* Submissions */}
        <TabsContent value='submissions' >
            <div className="h-[750px] p-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Language</TableHead>
                            <TableHead className="text-right">Memory</TableHead>
                            <TableHead className="text-right">Runtime</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {submissions.map(s => {
                            return <TableRow>
                                <TableCell className='grid grid-rows-2' >
                                    <span>{s.status}</span>
                                    <span className='text-gray-500' >{Date.now() - Date.parse(s.submittedOn)} ago</span>
                                </TableCell>
                                <TableCell className="" >{s.language}</TableCell>
                                <TableCell className="text-right text-gray-500" >{s.memory}</TableCell>
                                <TableCell className="text-right text-gray-500" >{s.runtime}</TableCell>
                        </TableRow>
                        })}
                    </TableBody>

                    <TableFooter className='mt-3' >
                        <TableRow><TableCell colSpan={4} className='text-gray-500' >x attempts</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value='leaderboard' >
            <div className="h-[750px] p-6">
                <Table>
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
                        {leaderboard.map((l, index) => {
                            return <TableRow>
                                <TableCell className="font-medium">#{index+1}</TableCell>
                                <TableCell className='font-semibold text-purple-600'>{l.name}</TableCell>
                                <TableCell className="text-right text-gray-500" >{l.points}</TableCell>
                                <TableCell className="text-right text-gray-500" >{l.solved}</TableCell>
                                <TableCell className="text-right text-gray-500" >{l.runtime}</TableCell>
                        </TableRow>
                        })}
                    </TableBody>

                    <TableFooter className='mt-3' >
                        <TableRow><TableCell colSpan={5} className='text-gray-500' >{leaderboard.length} participant(s)</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </TabsContent>

        {/* Discussion */}
        <TabsContent value='discussion' >
            <div className="h-[750px] p-6" >
                <WriteComment />
                <ViewComment />
            </div>
        </TabsContent>
    </Tabs>
  )
}

export default CodeDescArea