import * as React from "react"
import { Calendar } from "@/components/ui/calendar"

function HomePage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <>
        <div>
            <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border shadow-sm"
            captionLayout="dropdown"
            />
        </div>
      </>
    )
  }
  
  export default HomePage