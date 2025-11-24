import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "../components/ui/button"
import { Item, ItemContent, ItemTitle } from "@/components/ui/item"
import { columns } from "../components/HomePageQuestions/questionsColumns"
import type { Questions } from "../components/HomePageQuestions/questionsColumns"
import { DataTable } from "../components/HomePageQuestions/questionDataTable"
import type { CompetitionItem } from "@/types/CompetitionItem"
import {getCompetitions } from "@/api/homepageComp";
import {getQuestions} from "@/api/homepageQuestions";
import { logFrontend } from '../api/logFrontend';


function HomePage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [questions, setQuestions] = React.useState<Questions[]>([])
  const [competitions, setCompetitions] = React.useState<CompetitionItem[]>([])


  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await getQuestions();
        setQuestions(data);

        logFrontend({
          level: 'DEBUG', // <--- Now using DEBUG level
          message: `Finished initial data fetch for questions successfully.`,
          component: 'HomePage',
          url: window.location.href,
        });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError ? err.message : "Unknown error during question fetch.";
        
        console.error("Error fetching questions:", err);
        
        // Log the error to the backend
        logFrontend({
          level: 'ERROR',
          message: `API Error: Failed to fetch questions. Reason: ${errorMessage}`,
          component: 'HomePage',
          url: window.location.href,
          stack: isError ? err.stack : undefined, // Safely access stack
        });
      } 
    }

    fetchQuestions()
  }, [])

  React.useEffect(() => {
    const fetchCompetitions = async () => {
      try {
          const data = await getCompetitions();
          setCompetitions(data);

          logFrontend({
            level: 'INFO',
            message: `Competitions data loaded.`,
            component: 'HomePage',
            url: window.location.href,
          });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError ? err.message : "Unknown error during competition fetch.";
        
        console.error("Error fetching competitions:", err);
        
        // Log the error to the backend
        logFrontend({
          level: 'ERROR',
          message: `API Error: Failed to fetch competitions. Reason: ${errorMessage}`,
          component: 'HomePage',
          url: window.location.href,
          stack: isError ? err.stack : undefined, // Safely access stack
        });
      } 
    };
    fetchCompetitions()
  }, [])

  const competitionsForSelectedDate = React.useMemo(() => {
    if (!date) return []
    return competitions.filter(
      (c) => c.date.toDateString() === date.toDateString()
    )
  }, [date, competitions])

  const competitionDates = competitions.map((c) => c.date)

  return (
    <>
      <div className="flex flex-col w-[calc(100vw-var(--sidebar-width)-3rem)] ml-[1rem]">
        <Button className="relative h-[20vh] w-full text-base bg-primary hover:bg-border hover:text-black">
          <div className="absolute top-1 left-4">
            <h1 className="text-[clamp(1rem,3vw,2rem)] text-left font-semibold leading-tight">
              It's Competition Time!
            </h1>
            <p className="text-[clamp(0.5rem,2vw,1rem)] text-left mt-1">
              Click here to join in on the competition
            </p>
          </div>
        </Button>

        {/* This section of div is for calendar and search bar and table */}
        <div className="flex w-full  gap-6 mt-3 items-start">

          {/* This div is for search and table */}
          <div className="flex flex-col w-2/3 gap-4" >

            <div className="container mx-auto ">
              <DataTable columns={columns} data={questions} />
            </div>

          </div>

          <div className="flex flex-col w-[300px] gap-4 ml-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className=" rounded-md border shadow-sm self-end w-full"
              captionLayout="dropdown"
              modifiers={{ competition: competitionDates }}
              modifiersClassNames={{
              competition:
                  "relative after:content-[''] after:absolute after:bottom-[4px] after:left-1/2 after:-translate-x-1/2 after:w-[6px] after:h-[6px] after:rounded-full after:bg-primary",}}
            />

          <h2 className="text-xl font-semibold mb-2 text-center">
                  Competitions on {date?.toLocaleDateString() ?? "—"}
                </h2>

            <div className=" w-[300px] flex flex-col gap-2">
            {competitionsForSelectedDate.length === 0 ? (
                <p className="text-center text-gray-500 italic">No competitions on this date</p>
              ) : (
                competitionsForSelectedDate.map((competition) => (
                  <Item key={competition.competitionTitle} variant="outline" className="w-[300px] h-[100px] flex items-center justify-between overflow-hidden">
                    <ItemContent className="w-[70%] overflow-hidden justify-center items-center">
                      <ItemTitle className="truncate font-semibold text-center">{competition.competitionTitle}-{competition.date.toLocaleDateString()}</ItemTitle>
                    </ItemContent>
                  </Item>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HomePage