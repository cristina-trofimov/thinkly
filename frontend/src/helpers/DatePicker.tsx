import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  min?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, id, placeholder, min, className }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value ? new Date(value + "T00:00:00") : new Date());

  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const minDate = min ? new Date(min + "T00:00:00") : new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "YYYY-MM-DD"}
        className={className}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id ? `${id}-picker` : "date-picker"}
            variant="ghost"
            className=" absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0 cursor-pointer"
          >
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">Select date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            startMonth={new Date(2024, 0, 1)}
            endMonth={new Date(2050, 11, 31)}
            disabled={(date) => date < minDate}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                onChange(format(selectedDate, "yyyy-MM-dd"));
              }
              setOpen(false);
            }}
            modifiers={{ today: new Date() }}
            modifiersClassNames={{
              today:
                value && value !== format(new Date(), "yyyy-MM-dd")
                  ? "bg-accent text-accent-foreground font-normal rounded-md"
                  : "",
            }}
            classNames={{
              day_button: "hover:bg-primary/10",
              day_selected: "bg-primary text-white hover:bg-primary hover:text-white rounded-md",
              month_caption: "text-primary",
              day_disabled: "text-muted-foreground/30 opacity-30",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePicker;
