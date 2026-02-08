import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DatePicker from "../src/helpers/DatePicker";

jest.mock("@/components/ui/popover", () => {
  return {
    Popover: ({ children, open, onOpenChange }: any) => {
      // We attach the onOpenChange to the wrapper so we can simulate the trigger
      return (
        <div 
          data-testid="popover-root" 
          data-open={open} 
          onClick={() => onOpenChange?.(!open)}
        >
          {children}
        </div>
      );
    },
    PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
    PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
  };
});

jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect, disabled }: any) => (
    <div data-testid="mock-calendar">
      <button 
        onClick={() => onSelect(new Date(2026, 5, 15))} 
        data-testid="select-date-btn"
      >
        Select June 15
      </button>
      <div data-testid="test-min-check">
        {disabled(new Date(2020, 1, 1)) ? "2020 is disabled" : "2020 is enabled"}
      </div>
    </div>
  ),
}));

describe("DatePicker", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with placeholder when no value is provided", () => {
    render(<DatePicker onChange={mockOnChange} placeholder="Select Date" />);
    
    expect(screen.getByText("Select Date")).toBeInTheDocument();
  });

  it("renders the formatted date when a value is provided", () => {
    const testDate = "2026-12-25";
    render(<DatePicker value={testDate} onChange={mockOnChange} />);
    
    // date-fns "PPP" format for 2026-12-25 is "December 25th, 2026"
    expect(screen.getByText("December 25th, 2026")).toBeInTheDocument();
  });

  it("opens the calendar when the trigger button is clicked", () => {
    render(<DatePicker onChange={mockOnChange} placeholder="Pick a date" />);
    
    const trigger = screen.getByRole("button", { name: /pick a date/i });
    fireEvent.click(trigger);

    const popoverRoot = screen.getByTestId("popover-root");
    expect(popoverRoot).toHaveAttribute("data-open", "true");
  });

  it("calls onChange with 'yyyy-MM-dd' format and closes popover on date selection", () => {
    render(<DatePicker onChange={mockOnChange} placeholder="Pick a date" />);
    
    // Open popover
    fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    
    // Target the specific selection button inside the calendar via testid
    const selectBtn = screen.getByTestId("select-date-btn");
    fireEvent.click(selectBtn);

    expect(mockOnChange).toHaveBeenCalledWith("2026-06-15");
    
    const popoverRoot = screen.getByTestId("popover-root");
    expect(popoverRoot).toHaveAttribute("data-open", "false");
  });

  it("correctly disables dates earlier than the min prop", () => {
    // Set min date to 2025
    render(<DatePicker onChange={mockOnChange} min="2025-01-01" />);
    
    // Our mock calendar checks if 2020 is disabled based on the logic passed to it
    expect(screen.getByText("2020 is disabled")).toBeInTheDocument();
  });

  it("allows dates earlier than min if no min prop is provided", () => {
    render(<DatePicker onChange={mockOnChange} />);
    
    expect(screen.getByText("2020 is enabled")).toBeInTheDocument();
  });

  it("handles invalid date strings gracefully", () => {
    // Pass a nonsense string
    render(<DatePicker value="not-a-date" onChange={mockOnChange} placeholder="Invalid Fallback" />);
    
    expect(screen.getByText("Invalid Fallback")).toBeInTheDocument();
  });
});