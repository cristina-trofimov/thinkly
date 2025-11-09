import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCompetitionDialog from '../src/components/dashboard/CreateCompetitionDialog';

// Required for testing the time scheduling logic, as it's not exported from the component.
function localToUTCZ(dtLocal?: string) {
  if (!dtLocal) return undefined;
  const localDate = new Date(dtLocal);
  if (isNaN(localDate.getTime())) {
    return undefined;
  }
  const utcISOString = localDate.toISOString(); 
  return utcISOString.replace(".000Z", "Z"); 
}

// Mock the components that rely on specific paths or icons.
jest.mock('@tabler/icons-react', () => ({
  IconPlus: (props: any) => <svg data-testid="plus-icon" {...props} />,
  IconSearch: (props: any) => <svg data-testid="search-icon" {...props} />,
}));

// Mock the global fetch function for testing API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Utility to mock Date.now() for predictable ISO string generation
const mockDate = new Date('2025-11-08T10:00:00.000Z');
const mockDateNow = mockDate.getTime();
const mockOneMinuteFromNowISO = new Date(mockDateNow + 60_000).toISOString().replace(".000Z", "Z");


describe('CreateCompetitionDialog', () => {
  const mockOnOpenChange = jest.fn();
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    (Date.now as jest.Mock).mockRestore();
  });
  
  // --- Helper to fill all required fields for successful validation ---
  const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
      // 1. Fill General Info (Name, Date, Start/End Time)
      await user.type(screen.getByLabelText('Competition Name'), 'Valid Comp');
      // Note: For date/time inputs, userEvent.type usually expects a precise string format
      await user.type(screen.getByLabelText('Date'), '2026-10-25');
      await user.type(screen.getByLabelText('Start Time'), '10:00');
      await user.type(screen.getByLabelText('End Time'), '12:00');

      // 2. Select one question
      const question1Checkbox = screen.getByText('Two Sum').closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
      await user.click(question1Checkbox);
      
      // 3. Select one riddle
      const riddle1Checkbox = screen.getByText("Where's Waldo?").closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
      await user.click(riddle1Checkbox);
  };

  describe('Form Validation', () => {
    
    it('shows no error message initially', () => {
        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
        expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
    });

    it('blocks submission and shows error if General Information is incomplete', async () => {
        const user = userEvent.setup();
        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
        
        // Fill selections, but leave Name/Date/Times empty
        const question1Checkbox = screen.getByText('Two Sum').closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
        await user.click(question1Checkbox);
        const riddle1Checkbox = screen.getByText("Where's Waldo?").closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
        await user.click(riddle1Checkbox);

        await user.click(screen.getByRole('button', { name: /Create Competition/i }));

        await waitFor(() => {
            expect(screen.getByText('⚠️ Incomplete general information.')).toBeInTheDocument();
            expect(mockOnOpenChange).not.toHaveBeenCalled(); // Submission should be blocked
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    it('blocks submission and shows error if no Question is selected', async () => {
        const user = userEvent.setup();
        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
        
        // Fill General Info
        await user.type(screen.getByLabelText('Competition Name'), 'Valid Name');
        await user.type(screen.getByLabelText('Date'), '2026-10-25');
        await user.type(screen.getByLabelText('Start Time'), '10:00');
        await user.type(screen.getByLabelText('End Time'), '12:00');
        
        // Select one riddle (but no question)
        const riddle1Checkbox = screen.getByText("Where's Waldo?").closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
        await user.click(riddle1Checkbox);

        await user.click(screen.getByRole('button', { name: /Create Competition/i }));

        await waitFor(() => {
            expect(screen.getByText('⚠️ Please select at least one question.')).toBeInTheDocument();
            expect(mockOnOpenChange).not.toHaveBeenCalled();
        });
    });

    it('blocks submission and shows error if no Riddle is selected', async () => {
        const user = userEvent.setup();
        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
        
        // Fill General Info
        await user.type(screen.getByLabelText('Competition Name'), 'Valid Name');
        await user.type(screen.getByLabelText('Date'), '2026-10-25');
        await user.type(screen.getByLabelText('Start Time'), '10:00');
        await user.type(screen.getByLabelText('End Time'), '12:00');
        
        // Select one question (but no riddle)
        const question1Checkbox = screen.getByText('Two Sum').closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
        await user.click(question1Checkbox);

        await user.click(screen.getByRole('button', { name: /Create Competition/i }));

        await waitFor(() => {
            expect(screen.getByText('⚠️ Please select at least one riddle.')).toBeInTheDocument();
            expect(mockOnOpenChange).not.toHaveBeenCalled();
        });
    });

    it('allows submission when all fields and selections are complete', async () => {
        const user = userEvent.setup();
        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
        
        await fillRequiredFields(user);
        
        const createButton = screen.getByRole('button', { name: /Create Competition/i });
        await user.click(createButton);

        // Assert that validation passed (error cleared, dialog closed)
        await waitFor(() => {
            expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
            expect(consoleLogSpy).toHaveBeenCalledWith("Competition created:", expect.anything());
        });
    });
  });

  // -------------------------------------------------------------------
  // --- EXISTING TESTS (Modified to pass validation) ---
  // -------------------------------------------------------------------

  describe('Rendering', () => {
    // ... (Rendering tests remain the same)
  });

  describe('Form Interaction', () => {
    // ... (Form Interaction tests remain the same)
  });

  describe('Selection & Filtering', () => {
    // ... (Selection & Filtering tests remain the same)
  });

  describe('Submission (handleSubmit)', () => {
    
    // Test modified to fill required fields first
    it('calls onOpenChange(false) and resets state upon successful submission (no email)', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      await fillRequiredFields(user); // Added to pass validation
      
      const createButton = screen.getByRole('button', { name: /Create Competition/i });
      await user.click(createButton);

      expect(mockFetch).not.toHaveBeenCalled();
      
      // Should close dialog
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      
      // Should reset form data (checks Competition Name specifically)
      expect(screen.getByLabelText('Competition Name')).toHaveValue('');
    });

    // Test modified to fill required fields first
    it('sends email immediately when "To" is filled and no schedule is set', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'sent' }),
        status: 200,
      });

      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      await fillRequiredFields(user); // Added to pass validation

      await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
      await user.type(screen.getByLabelText('Subject'), 'Hi');
      await user.type(screen.getByLabelText('Message'), 'Body');

      await user.click(screen.getByRole('button', { name: /Create Competition/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
        
        expect(payload.to).toEqual(['test@example.com']);
        expect(payload.subject).toBe('Hi');
        expect(payload.text).toBe('Body');
        expect(payload.sendAt).toBeUndefined();
      });
    });

    // Test modified to fill required fields first
    it('schedules email for 1 minute from now when the switch is ON', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'scheduled' }),
        status: 200,
      });

      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      await fillRequiredFields(user); // Added to pass validation
      
      await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
      
      // Click the Send in 1 minute switch
      const switchToggle = screen.getByRole('switch', { name: /Send in 1 minute/i });
      await user.click(switchToggle);
      
      await user.click(screen.getByRole('button', { name: /Create Competition/i }));

      await waitFor(() => {
        const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
        
        expect(payload.to).toEqual(['test@example.com']);
        expect(payload.sendAt).toBe(mockOneMinuteFromNowISO);
      });
    });

    // Test modified to fill required fields first
    it('schedules email for local time when switch is OFF and time is provided', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'scheduled' }),
            status: 200,
        });

        const localTime = '2026-01-01T10:00';
        const expectedUTCZ = localToUTCZ(localTime);

        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
        await fillRequiredFields(user); // Added to pass validation

        await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
        
        // Input a scheduled local time
        const scheduleInput = screen.getByLabelText('Schedule (local time)');
        await user.type(scheduleInput, localTime);

        await user.click(screen.getByRole('button', { name: /Create Competition/i }));

        await waitFor(() => {
            const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
            
            expect(payload.sendAt).toBe(expectedUTCZ);
            expect(payload.to).toEqual(['test@example.com']);
        });
    });
    
    // Test modified to fill required fields for submission success
    it('logs an error if the email API call fails (HTTP status 400)', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad Request' }),
        status: 400,
      });

      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      await fillRequiredFields(user); // Added to pass validation

      await user.type(screen.getByLabelText('To (comma-separated)'), 'fail@example.com');
      
      const createButton = screen.getByRole('button', { name: /Create Competition/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Email send failed:", 'Bad Request');
      });
    });
  });
  
  describe('Cancel Button', () => {
    // ... (Cancel Button test remains the same)
  });
});