import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TimeInput } from "../src/helpers/TimeInput"; // Adjust path as needed

// 1. Mocks
// Mocking ScrollIntoView because JSDOM does not implement it
Element.prototype.scrollIntoView = jest.fn();

// Mocking Shadcn / Radix UI components to ensure visibility in tests
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open, onOpenChange }: any) => (
    <div data-testid="popover-root" data-open={open}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children, asChild }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

describe("TimeInput", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the input with the formatted 12h time based on 24h value", () => {
    render(<TimeInput value="14:30" onChange={mockOnChange} />);
    
    const input = screen.getByRole("textbox");
    // 14:30 should be displayed as 2:30 PM
    expect(input).toHaveValue("2:30 PM");
  });

  it("renders the placeholder when the value is empty", () => {
    render(<TimeInput value="" onChange={mockOnChange} placeholder="Select a time" />);
    
    const input = screen.getByPlaceholderText("Select a time");
    expect(input).toHaveValue("");
  });

  it("opens the time picker when the input is clicked", async () => {
    render(<TimeInput value="09:00" onChange={mockOnChange} />);
    
    const input = screen.getByRole("textbox");
    fireEvent.click(input);

    // Check if popover root state changed to open
    const popoverRoot = screen.getByTestId("popover-root");
    expect(popoverRoot).toHaveAttribute("data-open", "true");
  });

  it("switches between AM and PM periods in the list", () => {
    render(<TimeInput value="09:00" onChange={mockOnChange} />);
    
    // Trigger popover open (usually needed for content to render in some mock setups)
    fireEvent.click(screen.getByRole("textbox"));

    const amButton = screen.getByText("AM");
    const pmButton = screen.getByText("PM");

    // Click PM and check if a PM time label appears
    fireEvent.click(pmButton);
    expect(screen.getByText("1:00 PM")).toBeInTheDocument();

    // Click AM and check if an AM time label appears
    fireEvent.click(amButton);
    expect(screen.getByText("1:00 AM")).toBeInTheDocument();
  });

  it("calls onChange with 24h format when a time is selected", () => {
    render(<TimeInput value="09:00" onChange={mockOnChange} />);
    
    // Open picker
    fireEvent.click(screen.getByRole("textbox"));
    
    // Switch to PM and select 2:15 PM
    fireEvent.click(screen.getByText("PM"));
    const timeOption = screen.getByText("2:15 PM");
    fireEvent.click(timeOption);

    // 2:15 PM in 24h format is 14:15
    expect(mockOnChange).toHaveBeenCalledWith("14:15");
  });

  it("updates viewPeriod automatically when value prop changes", () => {
    const { rerender } = render(<TimeInput value="09:00" onChange={mockOnChange} />);
    
    // Open picker and see AM is active (default for 09:00)
    fireEvent.click(screen.getByRole("textbox"));
    expect(screen.getByText("AM")).toHaveClass("bg-primary");

    // Rerender with a PM value
    rerender(<TimeInput value="20:00" onChange={mockOnChange} />);
    
    // Now PM should be active
    expect(screen.getByText("PM")).toHaveClass("bg-primary");
  });
});