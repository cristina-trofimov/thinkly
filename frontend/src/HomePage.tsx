import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "./components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle} from "@/components/ui/item"
import { columns } from "./HomePageQuestions/questionsColumns"
import type { Questions } from "./HomePageQuestions/questionsColumns"
import { DataTable } from "./HomePageQuestions/questionDataTable"

function HomePage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    const questions: Questions[]= [
      {
        id: "1",
        questionTitle: "Two sum",
        date: new Date('2025-08-02'),
        difficulty: "Easy",
      },
      {
        id: "2",
        questionTitle: "Palindrome",
        date: new Date('2025-08-15'),
        difficulty: "Medium",
      },
      {
        id: "3",
        questionTitle: "Two sum",
        date: new Date('2025-07-01'),
        difficulty: "Hard",
      },
      {
        id: "4",
        questionTitle: "Christmas Tree",
        date: new Date('2025-07-12'),
        difficulty: "Easy",
      },
      {
        id: "5",
        questionTitle: "Inverse String",
        date: new Date('2025-08-03'),
        difficulty: "Easy",
      },
      {
        id: "6",
        questionTitle: "Hash Map",
        date: new Date('2025-08-03'),
        difficulty: "Medium",
      },
      {
        id: "7",
        questionTitle: "Binary Tree",
        date: new Date("2025-08-19"),
        difficulty: "Hard",
      }
    ]

    const competitions =[
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
          <Button className="relative h-[20vh] w-full text-base bg-[#8065CD] hover:bg-border hover:text-black">
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
                                      <ItemActions  className="w-[30%] flex justify-end">
                                        <Button data-testid={`competition-button-${competition.status.toLowerCase()}`} variant="outline" size="sm"className=" truncate text-[#8065CD] max-w-[80px]" >
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