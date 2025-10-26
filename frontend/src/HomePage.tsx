import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "./components/ui/button"

function HomePage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <>
        <div>
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

          <div className="flex justify-end mt-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm"
              captionLayout="dropdown"
              />
          </div> 
        </div>
      </>
    )
  }
  
  export default HomePage