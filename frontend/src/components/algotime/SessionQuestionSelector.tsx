import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react"
import type { Question } from "../interfaces/Question";
import { format } from "date-fns"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface SessionQuestionSelectorProps {
    sessionNumber: number;
    sessionDate: string;
    questions: Question[];
    sessionQuestions: { [key: number]: number[] };
    searchQueries: { [key: number]: string };
    setSearchQueries: (queries: { [key: number]: string }) => void;
    difficultyFilters: { [key: number]: string | undefined };
    setDifficultyFilters: (filters: { [key: number]: string | undefined }) => void;
    toggleQuestionForSession: (sessionNum: number, questionId: number) => void;
    getDifficultyColor: (difficulty: string) => string;
}

export const SessionQuestionSelector = ({
    sessionNumber,
    sessionDate,
    questions,
    sessionQuestions,
    searchQueries,
    setSearchQueries,
    difficultyFilters,
    setDifficultyFilters,
    toggleQuestionForSession,
    getDifficultyColor
}: SessionQuestionSelectorProps) => {


    const sessionSearch = searchQueries[sessionNumber] || "";
    const sessionDifficulty = difficultyFilters[sessionNumber];

    const sessionFilteredQuestions = questions.filter((q) => {
        const matchesSearch = q.title?.toLowerCase().includes(sessionSearch.toLowerCase()) ?? false;
        const matchesDifficulty = !sessionDifficulty || q.difficulty === sessionDifficulty;
        return matchesSearch && matchesDifficulty;
    });

    return (
        <div key={sessionNumber} className="mb-6 border rounded-lg p-4">
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold mb-2">
                        Session {sessionNumber}{sessionDate ? ` - ${format(new Date(sessionDate + 'T00:00:00'), 'PPP')}` : ''}
                    </AccordionTrigger>
                    <AccordionContent>

                        <p className="text-sm text-gray-500 mb-3">
                            {sessionQuestions[sessionNumber]?.length || 0} question(s) selected
                        </p>

                        {/* Search bar AND filter */}
                        <div className="flex gap-3 mb-4">
                            <input
                                type="text"
                                value={sessionSearch}
                                onChange={(e) => setSearchQueries({
                                    ...searchQueries,
                                    [sessionNumber]: e.target.value
                                })}
                                placeholder="Search questions..."
                                className=" w-100 px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:primary focus:border-transparent"
                            />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-0.5">
                                        <Filter className=" mb- 4 h-4 w-4 text-primary" />
                                        <span className="ml-2 hidden md:inline-flex items-center">
                                            {sessionDifficulty ?? "All"}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setDifficultyFilters({
                                        ...difficultyFilters,
                                        [sessionNumber]: undefined
                                    })}>
                                        All
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilters({
                                        ...difficultyFilters,
                                        [sessionNumber]: "Easy"
                                    })}>
                                        Easy
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilters({
                                        ...difficultyFilters,
                                        [sessionNumber]: "Medium"
                                    })}>
                                        Medium
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilters({
                                        ...difficultyFilters,
                                        [sessionNumber]: "Hard"
                                    })}>
                                        Hard
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                            {sessionFilteredQuestions.map((q) => (
                                <div
                                    key={q.id}
                                    onClick={() => toggleQuestionForSession(sessionNumber, q.id as number)}
                                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${sessionQuestions[sessionNumber]?.includes(q.id as number) ? 'bg-primary/10' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={sessionQuestions[sessionNumber]?.includes(q.id as number) || false}
                                                onChange={() => { }}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            <span className="font-medium text-gray-900">{q.title}</span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(q.difficulty || "unknown")}`}>
                                            {q.difficulty || "unknown"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>);
};      
