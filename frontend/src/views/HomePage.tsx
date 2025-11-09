import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "../components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { columns } from "../components/HomePageQuestions/questionsColumns"
import type { Questions } from "../components/HomePageQuestions/questionsColumns"
import { DataTable } from "../components/HomePageQuestions/questionDataTable"
import { config } from "./../config";


function HomePage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [questions, setQuestions] = React.useState<Questions[]>([])
  const [loading, setLoading] = React.useState(true)


  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(config.backendUrl + "/get-questions");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();

        const formatted: Questions[] = data.map((q: any) =>({
          id: q.id,
          questionTitle: q.questionTitle,
          date: new Date(q.date),
          difficulty: q.difficulty,
        }));

        setQuestions(formatted)
      } catch (err) {
        console.error("Error fetching questions:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])


  const competitions = [
    //once we get the db connection we need to switch this maybe something
    // with the list of attendees and when 
    //an attendee is in we change the status 
    {
      competitionTitle: "WebComp",
      competitionDesc: "3 hours to build an aesthetic website",
      date: new Date('2025-11-03'),
      status: "Registered",
    },
    {
      competitionTitle: "CyberComp",
      competitionDesc: "45 mins to complete as many riddles as possible",
      date: new Date(),
      status: "Join",
    },

  ]
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
            />
            Upcoming Competitions

            <div className=" w-[300px] flex flex-col gap-2">
              {competitions.map((competition) => (
                <Item key={competition.competitionTitle} variant="outline" className="w-[300px] h-[100px] flex items-center justify-between overflow-hidden">
                  <ItemContent className="w-[70%] overflow-hidden">
                    <ItemTitle className="truncate font-semibold">{competition.competitionTitle}-{competition.date.toLocaleDateString()}</ItemTitle>
                    <ItemDescription className="truncate text-sm text-gray-600 text-left">{competition.competitionDesc}</ItemDescription>
                  </ItemContent>
                  <ItemActions className="w-[30%] flex justify-end">
                    <Button data-testid={`competition-button-${competition.status.toLowerCase()}`} variant="outline" size="sm" className=" truncate text-[#8065CD] max-w-[80px]" >
                      {competition.status}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HomePage