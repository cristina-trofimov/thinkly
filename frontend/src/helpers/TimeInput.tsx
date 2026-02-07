import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

function to12h(time24: string): { display: string; period: "AM" | "PM" } {
  if (!time24?.includes(":")) return { display: "", period: "AM" };
  const [hStr, mStr] = time24.split(":");
  let h = Number.parseInt(hStr, 10);
  const m = mStr.padStart(2, "0");
  if (Number.isNaN(h)) return { display: "", period: "AM" };
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { display: `${h}:${m} ${period}`, period };
}

export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange, id, placeholder }, _ref) => {
    const [open, setOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const currentParsed = to12h(value);
    const [viewPeriod, setViewPeriod] = useState<"AM" | "PM">(currentParsed.period);

    // Sync viewPeriod when value changes externally
    useEffect(() => {
      if (value?.includes(":")) {
        setViewPeriod(to12h(value).period);
      }
    }, [value]);

    // Generate times for the active period (AM or PM)
    const times = useMemo(() => {
      const result: { label: string; value24: string }[] = [];
      const startHour24 = viewPeriod === "AM" ? 0 : 12;
      for (let h = startHour24; h < startHour24 + 12; h++) {
        for (let m = 0; m < 60; m += 15) {
          const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          const label = `${h12}:${String(m).padStart(2, "0")} ${viewPeriod}`;
          const value24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          result.push({ label, value24 });
        }
      }
      return result;
    }, [viewPeriod]);

    // Auto-scroll to selected time when popover opens
    useEffect(() => {
      if (open && listRef.current && value) {
        const selectedEl = listRef.current.querySelector("[data-selected='true']");
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: "center" });
        }
      }
    }, [open, value, viewPeriod]);

    const handleSelect = useCallback(
      (value24: string) => {
        onChange(value24);
        setOpen(false);
      },
      [onChange]
    );

    return (
      <div className="relative">
        <Input
          id={id}
          type="text"
          readOnly
          value={currentParsed.display}
          placeholder={placeholder || "Select time"}
          className="pr-10 cursor-pointer"
          onClick={() => setOpen(true)}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id ? `${id}-picker` : "time-picker"}
              variant="ghost"
              className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0 cursor-pointer"
            >
              <Clock className="size-3.5" />
              <span className="sr-only">Select time</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-48 p-0 overflow-hidden"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            {/* AM/PM toggle */}
            <div className="flex border-b">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  viewPeriod === "AM"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewPeriod("AM")}
              >
                AM
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  viewPeriod === "PM"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewPeriod("PM")}
              >
                PM
              </button>
            </div>

            {/* Time list */}
            <div ref={listRef} className="max-h-52 overflow-y-auto">
              {times.map((t) => (
                <div
                  key={t.value24}
                  data-selected={value === t.value24}
                  onClick={() => handleSelect(t.value24)}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    value === t.value24
                      ? "bg-primary/15 font-semibold text-primary"
                      : "hover:bg-primary/5"
                  }`}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";
