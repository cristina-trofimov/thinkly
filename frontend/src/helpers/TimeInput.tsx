import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  step?: string;
}

/**
 * Custom time input with dropdown picker that works reliably across all browsers including Safari.
 * Formats time as HH:MM (no seconds).
 */
export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange, id, placeholder, step }, _ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredTimes, setFilteredTimes] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Generate list of all times in 15-minute intervals (stable reference)
    const allTimes = useMemo(() => Array.from({ length: 96 }, (_, i) => {
      const hours = Math.floor(i / 4);
      const minutes = (i % 4) * 15;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }), []);

    useEffect(() => {
      // Filter times based on current input
      if (value) {
        const filtered = allTimes.filter((time) =>
          time.toLowerCase().startsWith(value.toLowerCase())
        );
        setFilteredTimes(filtered.length > 0 ? filtered : allTimes);
      } else {
        setFilteredTimes(allTimes);
      }
    }, [value, allTimes]);

    useEffect(() => {
      // Close dropdown when clicking outside
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Remove any non-time characters
      inputValue = inputValue.replace(/[^\d:]/g, "");

      // Handle different input formats
      if (inputValue.length <= 2) {
        // Just hours
        if (inputValue && parseInt(inputValue) > 23) {
          inputValue = "23";
        }
      } else if (inputValue.length <= 5) {
        // Hours and minutes (HH:MM)
        const parts = inputValue.split(":");
        if (parts.length === 1) {
          inputValue = parts[0];
        } else {
          const hours = parts[0];
          const minutes = parts[1];

          // Validate hours
          if (hours && parseInt(hours) > 23) {
            inputValue = "23:" + (minutes || "");
          }
          // Validate minutes
          if (minutes && parseInt(minutes) > 59) {
            inputValue = (hours || "00") + ":59";
          }

          // Format as HH:MM
          if (
            hours &&
            minutes &&
            hours.length === 2 &&
            minutes.length === 2
          ) {
            inputValue = `${hours}:${minutes}`;
          }
        }
      } else {
        // If user tries to enter more, limit to HH:MM
        const parts = inputValue.split(":");
        const hours = parts[0] || "00";
        const minutes = parts[1] || "00";
        inputValue = `${hours}:${minutes}`;
      }

      onChange(inputValue);
      setIsOpen(true); // Keep dropdown open while typing
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      let finalValue = e.target.value;

      // If user entered partial time, format it
      if (finalValue && !finalValue.includes(":")) {
        const num = parseInt(finalValue);
        if (!isNaN(num) && num >= 0 && num <= 23) {
          finalValue = `${String(num).padStart(2, "0")}:00`;
        }
      } else if (finalValue && finalValue.split(":").length >= 2) {
        // Has hours and minutes
        const [hours, minutes] = finalValue.split(":");
        finalValue = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }

      onChange(finalValue);
    };

    const handleSelectTime = (time: string) => {
      onChange(time);
      setIsOpen(false);
      inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="time"
            placeholder={placeholder || "HH:MM"}
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            pattern="\d{2}:\d{2}"
            step={step}
            className="font-mono pr-10 cursor-pointer"
            maxLength={5}
          />
          <Clock
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          />
        </div>

        {isOpen && filteredTimes.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
            {filteredTimes.map((time) => (
              <div
                key={time}
                onClick={() => handleSelectTime(time)}
                className={`px-3 py-2 cursor-pointer hover:bg-primary/10 ${
                  value === time ? "bg-primary/20 font-semibold" : ""
                }`}
              >
                {time}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";
