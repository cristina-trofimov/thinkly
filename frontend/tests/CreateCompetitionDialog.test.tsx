import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCompetitionDialog from '../src/components/dashboard/CreateCompetitionDialog';

// Helper function copied from the component, necessary for calculating expected output
function localToUTCZ(dtLocal?: string) {
  if (!dtLocal) return undefined;
  const localDate = new Date(dtLocal);
  if (isNaN(localDate.getTime())) {
    // Error handling is necessary for the function to behave correctly
    return undefined;
  }
  const utcISOString = localDate.toISOString(); 
  return utcISOString.replace(".000Z", "Z"); 
}

// Mock the components that rely on specific paths or icons
// Note: IconPlus and IconSearch are mocked here for testing simplicity.
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock Date.now() to control oneMinuteFromNowISO()
    jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
    (Date.now as jest.Mock).mockRestore();
  });

  // --- Rendering and Initial State Tests ---
  describe('Rendering', () => {
    it('renders the dialog title when open is true', () => {
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText('Create New Competition')).toBeInTheDocument();
      expect(screen.getByText('Fill in the details below to create a new competition.')).toBeInTheDocument();
    });

    it('does not render content when open is false', () => {
      render(<CreateCompetitionDialog open={false} onOpenChange={mockOnOpenChange} />);
      // We rely on the Dialog component to hide content, but check for the absence of a unique title
      expect(screen.queryByText('Create New Competition')).not.toBeInTheDocument();
    });

    it('renders all main form sections and inputs', () => {
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByLabelText('Competition Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByText('Question Selection')).toBeInTheDocument();
      expect(screen.getByText('Riddle Selection')).toBeInTheDocument();
      expect(screen.getByText('Email Notification')).toBeInTheDocument();
    });
  });

  // --- Form Input and State Management Tests ---
  describe('Form Interaction', () => {
    it('updates the Competition Name field correctly', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      const nameInput = screen.getByLabelText('Competition Name');
      
      await user.type(nameInput, 'The Big Kahuna');
      
      expect(nameInput).toHaveValue('The Big Kahuna');
    });

    it('updates cooldown time fields correctly', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      const qCooldownInput = screen.getByLabelText('Cooldown Time Between Questions (seconds)');
      const rCooldownInput = screen.getByLabelText('Cooldown Time Between Riddles (seconds)');

      await user.type(qCooldownInput, '30');
      await user.type(rCooldownInput, '60');
      
      expect(qCooldownInput).toHaveValue(30);
      expect(rCooldownInput).toHaveValue(60);
    });
  });

  // --- Question/Riddle Selection and Filtering Tests ---
  describe('Selection & Filtering', () => {
    it('filters questions based on search query', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      const searchInput = screen.getByPlaceholderText('Search questions...');
      await user.type(searchInput, 'Reverse');

      expect(screen.getByText('Reverse Linked List')).toBeInTheDocument();
      expect(screen.queryByText('Two Sum')).not.toBeInTheDocument();
    });

    it('toggles question selection when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      const question1Checkbox = screen.getByText('Two Sum').closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;

      // Select
      await user.click(question1Checkbox);
      expect(question1Checkbox).toHaveAttribute('aria-checked', 'true');

      // Deselect
      await user.click(question1Checkbox);
      expect(question1Checkbox).toHaveAttribute('aria-checked', 'false');
    });
    
    it('toggles riddle selection when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      const riddle1Checkbox = screen.getByText("Where's Waldo?").closest('.flex-1')!.parentElement!.querySelector('button[role="checkbox"]') as HTMLButtonElement;

      // Select
      await user.click(riddle1Checkbox);
      expect(riddle1Checkbox).toHaveAttribute('aria-checked', 'true');
    });
  });

  // --- Submission and API Interaction Tests ---
  describe('Submission (handleSubmit)', () => {
    
    it('calls onOpenChange(false) and resets state upon successful submission (no email)', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      // Fill a field to confirm state reset later
      await user.type(screen.getByLabelText('Competition Name'), 'Test Comp');
      
      const createButton = screen.getByRole('button', { name: /Create Competition/i });
      await user.click(createButton);

      expect(mockFetch).not.toHaveBeenCalled();
      
      // Should close dialog
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      
      // Should reset form data
      expect(screen.getByLabelText('Competition Name')).toHaveValue('');
    });

    it('sends email immediately when "To" is filled and no schedule is set', async () => {
      const user = userEvent.setup();
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'sent' }),
        status: 200,
      });

      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
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

    it('schedules email for 1 minute from now when the switch is ON', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'scheduled' }),
        status: 200,
      });

      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
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

    it('schedules email for local time when switch is OFF and time is provided', async () => {
        const user = userEvent.setup();
        // Mock successful fetch response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'scheduled' }),
            status: 200,
        });

        const localTime = '2026-01-01T10:00';
        const expectedUTCZ = localToUTCZ(localTime);

        render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);

        await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
        
        // Input a scheduled local time
        const scheduleInput = screen.getByLabelText('Schedule (local time)');
        await user.type(scheduleInput, localTime); // Note: user.type handles datetime-local format gracefully

        await user.click(screen.getByRole('button', { name: /Create Competition/i }));

        await waitFor(() => {
            const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
            
            expect(payload.sendAt).toBe(expectedUTCZ);
            expect(payload.to).toEqual(['test@example.com']);
        });
    });
    
    it('logs an error if the email API call fails (HTTP status 400)', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad Request' }),
        status: 400,
      });

      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      await user.type(screen.getByLabelText('To (comma-separated)'), 'fail@example.com');
      
      const createButton = screen.getByRole('button', { name: /Create Competition/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Email send failed:", 'Bad Request');
      });
    });
  });
  
  // --- Cancel Button Test ---
  describe('Cancel Button', () => {
    it('closes the dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});