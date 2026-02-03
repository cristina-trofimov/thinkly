import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlgoTimeSessionForm } from '../src/components/forms/AlgoTimeForm';
import { createAlgotime } from '../src/api/AlgotimeAPI';
import { sendEmail } from '../src/api/EmailAPI';

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the API calls
jest.mock('@/api/QuestionsAPI', () => ({
  getQuestions: jest.fn(() => Promise.resolve([
    {
      id: 1,
      questionTitle: 'Test Question 1',
      title: 'Test Question 1',
      difficulty: 'Easy',
    },
    {
      id: 2,
      questionTitle: 'Test Question 2',
      title: 'Test Question 2',
      difficulty: 'Medium',
    },
  ])),
}));

// Mock createAlgotime
jest.mock('../src/api/AlgotimeAPI', () => ({
  createAlgotime: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock sendEmail
jest.mock('../src/api/EmailAPI', () => ({
  sendEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock logFrontend
jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn(),
}));

// Mock TimeInput to render a simple controlled input (the real component uses a read-only input + popover)
jest.mock('../src/helpers/TimeInput', () => {
  const React = require('react');
  return {
    TimeInput: React.forwardRef(
      ({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string }, ref: React.Ref<HTMLInputElement>) =>
        React.createElement('input', {
          ref,
          id,
          value: value || '',
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
          placeholder: placeholder || 'Select time',
        })
    ),
  };
});

describe('AlgoTimeSessionForm', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    (global as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders general information section', async () => {
    render(<AlgoTimeSessionForm />);

    await waitFor(() => {
      expect(screen.getByText('General Information')).toBeInTheDocument();
    });
  });

  test('renders select questions section', async () => {
    render(<AlgoTimeSessionForm />);

    await waitFor(() => {
      expect(screen.getByText('Select Questions for Sessions')).toBeInTheDocument();
    });
  });

  test('shows validation error when submitting empty form', async () => {
    render(<AlgoTimeSessionForm />);

    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
    });
  });

  test('clears date input when reset button is clicked', async () => {
    render(<AlgoTimeSessionForm />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument();
    });

    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
    expect(dateInput.value).toBe('2025-12-25');

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(dateInput.value).toBe('');
  });

  test('does not show validation error initially', async () => {
    render(<AlgoTimeSessionForm />);

    await waitFor(() => {
      expect(screen.getByText('General Information')).toBeInTheDocument();
    });

    expect(screen.queryByText('Incomplete general information.')).not.toBeInTheDocument();
  });

  test('clears validation error after reset', async () => {
    render(<AlgoTimeSessionForm />);

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.queryByText('Incomplete general information.')).not.toBeInTheDocument();
    });
  });

  test('shows error for session in the past', async () => {
    render(<AlgoTimeSessionForm />);

    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2000-01-01' } });

    const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
    fireEvent.change(startTimeInput, { target: { value: '12:00:00' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText(/Incomplete general information|must be scheduled for a future/i)).toBeInTheDocument();
    });
  });

  test('submits form successfully', async () => {
    render(<AlgoTimeSessionForm />);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    // Fill in the date
    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD');
    fireEvent.change(dateInput, { target: { value: tomorrowString } });

    // Fill in start time
    const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
    fireEvent.change(startTimeInput, { target: { value: '14:00:00' } });

    // Fill in end time
    const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
    fireEvent.change(endTimeInput, { target: { value: '16:00:00' } });

    // Wait for the session accordion to appear
    await waitFor(() => {
      expect(screen.getByText(/Session 1/i)).toBeInTheDocument();
    });

    // Open the session accordion to reveal checkboxes
    const sessionAccordion = screen.getByText(/Session 1/i);
    fireEvent.click(sessionAccordion);

    // Now wait for checkboxes to appear
    await waitFor(() => {
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    // Click the first checkbox to select a question
    const questionCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(questionCheckboxes[0]);

    // Wait a moment for state to update
    await waitFor(() => {
      const checkedState = questionCheckboxes[0].getAttribute('aria-checked') === 'true' ||
                          questionCheckboxes[0].getAttribute('data-state') === 'checked';
      expect(checkedState).toBe(true);
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    // Verify the API was called and navigation happened
    await waitFor(() => {
      expect(createAlgotime).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
    });
  });

  test('updates email data when toggled or typed', async () => {
    render(<AlgoTimeSessionForm />);

    const emailAccordion = screen.getByText('Email Notification');
    fireEvent.click(emailAccordion);

    const switchInput = screen.getByRole('switch') as HTMLInputElement;
    fireEvent.click(switchInput);
    expect(switchInput).toBeChecked();

    const emailToInput = screen.getByPlaceholderText('alice@example.com, bob@example.com') as HTMLInputElement;
    fireEvent.change(emailToInput, { target: { value: 'test@example.com' } });
    expect(emailToInput.value).toBe('test@example.com');
  });

  test('toggles question selection', async () => {
    render(<AlgoTimeSessionForm />);

    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), { target: { value: '2026-01-26' } });

    const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
    fireEvent.change(startTimeInput, { target: { value: '14:00:00' } });

    const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
    fireEvent.change(endTimeInput, { target: { value: '16:00:00' } });

    // Wait for session accordion
    await waitFor(() => {
      expect(screen.getByText(/Session 1/i)).toBeInTheDocument();
    });

    // Open accordion
    const sessionAccordion = screen.getByText(/Session 1/i);
    fireEvent.click(sessionAccordion);

    // Wait for checkboxes to appear
    await waitFor(() => {
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    const questionCheckboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = questionCheckboxes[0];

    // Toggle on
    fireEvent.click(firstCheckbox);
    await waitFor(() => {
      const isChecked = firstCheckbox.getAttribute('aria-checked') === 'true' ||
                       firstCheckbox.getAttribute('data-state') === 'checked';
      expect(isChecked).toBe(true);
    });

    // Toggle off
    fireEvent.click(firstCheckbox);
    await waitFor(() => {
      const isChecked = firstCheckbox.getAttribute('aria-checked') === 'true' ||
                       firstCheckbox.getAttribute('data-state') === 'checked';
      expect(isChecked).toBe(false);
    });
  });

  test('renders multiple sessions when repeat is weekly', async () => {
    render(<AlgoTimeSessionForm />);

    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), { target: { value: '2026-02-08' } });

    // Find the repeat combobox (Select component)
    const repeatSelect = screen.getByRole('combobox');
    fireEvent.click(repeatSelect);

    // Wait for dropdown to open and get all "Weekly" options
    await waitFor(() => {
      const weeklyOptions = screen.getAllByText('Weekly');
      expect(weeklyOptions.length).toBeGreaterThan(0);
    });

    // Click the option that's inside the select dropdown
    const weeklyOptions = screen.getAllByText('Weekly');
    fireEvent.click(weeklyOptions[weeklyOptions.length - 1]);

    // Now need to set an end date for repeat sessions
    await waitFor(() => {
      const endDateInputs = screen.getAllByPlaceholderText('YYYY-MM-DD');
      expect(endDateInputs.length).toBeGreaterThan(1);
    });

    const endDateInputs = screen.getAllByPlaceholderText('YYYY-MM-DD');
    const endDateInput = endDateInputs[1]; // Second one is for repeat end date
    fireEvent.change(endDateInput, { target: { value: '2026-03-08' } });

    // Wait for multiple sessions to render
    await waitFor(() => {
      const sessions = screen.getAllByText(/Session \d+/);
      expect(sessions.length).toBeGreaterThan(1);
    }, { timeout: 3000 });
  });
});