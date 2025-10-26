import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import type { ProblemInfo } from './interfaces/ProblemInfo'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table'

// const CodeDescArea = (problem: ProblemInfo) => {
const CodeDescArea = () => {

    
  return (
    <Tabs defaultValue='description' >
        <TabsList 
            className="w-full relative justify-between rounded-none h-10 bg-muted 
                        border-b border-border/75 dark:border-border/50 py-0 px-4"
            
            // activeClassName="rounded-none shadow-none bg-transparent after:content-[''] after:absolute after:inset-x-0 after:h-0.5 after:bottom-0 dark:after:bg-white after:bg-black after:rounded-t-full"
        >
            <TabsTrigger value="description"
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
                Description
            </TabsTrigger>
            <TabsTrigger value="submissions"
                className='bg-muted rounded-none
                           data-[state=active]:border-purple-700
                           data-[state=active]:text-purple-700
                           data-[state=active]:bg-muted
                           data-[state=active]:shadow-none
                           data-[state=active]:border-b-[2.5px]
                           data-[state=active]:border-x-0
                           data-[state=active]:border-t-0
                           '
            >
                Submissions
            </TabsTrigger>
            <TabsTrigger value="leaderboard"
                className='bg-muted rounded-none
                           data-[state=active]:border-purple-700
                           data-[state=active]:text-purple-700
                           data-[state=active]:bg-muted
                           data-[state=active]:shadow-none
                           data-[state=active]:border-b-[2.5px]
                           data-[state=active]:border-x-0
                           data-[state=active]:border-t-0
                           '
            >
                Leaderboard
            </TabsTrigger>
            <TabsTrigger value="discussion"
                className='bg-muted rounded-none
                           data-[state=active]:border-purple-700
                           data-[state=active]:text-purple-700
                           data-[state=active]:bg-muted
                           data-[state=active]:shadow-none
                           data-[state=active]:border-b-[2.5px]
                           data-[state=active]:border-x-0
                           data-[state=active]:border-t-0
                           '
            >
                Discussion
            </TabsTrigger>
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
            <div className="flex h-[750px] p-6">
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
                        <TableRow>
                            <TableCell className='grid grid-rows-2' >
                                <span>Status</span>
                                <span className='text-gray-500' >2 minutes ago</span>
                            </TableCell>
                            <TableCell className="text-right" >Java</TableCell>
                            <TableCell className="text-right text-gray-500" >12</TableCell>
                            <TableCell className="text-right text-gray-500" >23 min</TableCell>
                        </TableRow>
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
            <div className="flex h-[750px] p-6">
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
                        <TableRow>
                            <TableCell className="font-medium">#1</TableCell>
                            <TableCell>Someone S.</TableCell>
                            <TableCell className="text-right text-gray-500" >250</TableCell>
                            <TableCell className="text-right text-gray-500" >12</TableCell>
                            <TableCell className="text-right text-gray-500" >23 min</TableCell>
                        </TableRow>
                    </TableBody>

                    <TableFooter className='mt-3' >
                        <TableRow><TableCell colSpan={5} className='text-gray-500' >1 participant</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </TabsContent>

        {/* Discussion */}
        <TabsContent value='discussion' >
            <div className="flex h-[750px] p-6">
                <span className="font-semibold">Discussion</span>
            </div>
        </TabsContent>
    </Tabs>
  )
}

export default CodeDescArea