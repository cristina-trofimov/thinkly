import * as React from "react";
import { useState } from "react"; // Added this
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  min?: string;
  className?: string;
}

export default function DatePicker({ value, onChange, min, className, placeholder }: Readonly<DatePickerProps>) {
  // 1. Define the state to control the popover
  const [open, setOpen] = useState(false);

  const date = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const minDate = React.useMemo(() => {
    if (!min) return undefined;
    const parsed = parseISO(min);
    return isValid(parsed) ? parsed : undefined;
  }, [min]);

  return (
    <div className="relative w-full">
      {/* 2. 'open' and 'onOpenChange' now point to our state above */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal border-input bg-background",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder || "Pick a date"}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[110]"
          align="start"
          side="bottom"
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                onChange(format(selectedDate, "yyyy-MM-dd"));
                setOpen(false); // Successfully closes the popover
              }
            }}
            disabled={(d) => (minDate ? d < minDate : false)}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}