import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlgoTimeSessionForm } from '../src/components/forms/AlgoTimeForm';
import { createAlgotime } from '../src/api/AlgotimeAPI';
import { getQuestions } from '../src/api/QuestionsAPI';
import { logFrontend } from '../src/api/LoggerAPI';
import { toast } from 'sonner';
import axiosClient from '../src/lib/axiosClient';

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

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
jest.mock('../src/api/QuestionsAPI');
jest.mock('../src/api/AlgotimeAPI');
jest.mock('../src/api/LoggerAPI');

// Mock DatePicker component
jest.mock('../src/helpers/DatePicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, value, onChange, min }: any) =>
      React.createElement('input', {
        id,
        type: 'text',
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        placeholder: 'YYYY-MM-DD',
        'data-testid': id || 'repeatEndDate',
      }),
  };
});

// Mock TimeInput
jest.mock('../src/helpers/TimeInput', () => {
  const React = require('react');
  return {
    TimeInput: React.forwardRef(
      ({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }, ref: React.Ref<HTMLInputElement>) =>
        React.createElement('input', {
          ref,
          id,
          'aria-label': id?.includes('startTime') ? 'Start Time' : 'End Time',
          value: value || '',
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
          placeholder: 'Select time',
        })
    ),
  };
});

// Mock SessionQuestionSelector
jest.mock('../src/components/algotime/SessionQuestionSelector', () => ({
  SessionQuestionSelector: ({ 
    sessionNumber, 
    sessionDate, 
    questions, 
    sessionQuestions,
    toggleQuestionForSession, 
    sessionNames,
    setSessionNames
  }: any) => {
    const React = require('react');
    return React.createElement('div', {
      'data-testid': `session-${sessionNumber}`,
    }, [
      React.createElement('input', {
        key: 'name-input',
        'aria-label': 'Session Name',
        value: sessionNames[sessionNumber] || '',
        onChange: (e: any) => setSessionNames((prev: any) => ({ ...prev, [sessionNumber]: e.target.value })),
      }),
      React.createElement('button', {
        key: 'accordion-trigger',
        onClick: (e: any) => {
          e.currentTarget.setAttribute('aria-expanded', 
            e.currentTarget.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
          );
        },
        'aria-expanded': 'false',
      }, `Session ${sessionNumber} - ${sessionDate}`),
      React.createElement('div', {
        key: 'questions-list',
        'data-testid': `questions-list-${sessionNumber}`,
      }, questions.map((q: any) => 
        React.createElement('div', { key: q.id }, [
          React.createElement('input', {
            key: 'checkbox',
            type: 'checkbox',
            'data-testid': `question-${sessionNumber}-${q.id}`,
            checked: sessionQuestions[sessionNumber]?.includes(q.id) || false,
            onChange: () => toggleQuestionForSession(sessionNumber, q.id),
            'aria-checked': sessionQuestions[sessionNumber]?.includes(q.id) ? 'true' : 'false',
          }),
          React.createElement('span', { key: 'title' }, q.title),
        ])
      ))
    ]);
  },
}));

const mockQuestions = [
  {
    id: 1,
    title: 'Test Question 1',
    difficulty: 'Easy',
    date: new Date('2024-01-01'),
    description: 'Test',
    media: '',
    preset_code: '',
    template_solution: '',
  },
  {
    id: 2,
    title: 'Test Question 2',
    difficulty: 'Medium',
    date: new Date('2024-01-02'),
    description: 'Test',
    media: '',
    preset_code: '',
    template_solution: '',
  },
];

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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    
    (getQuestions as jest.Mock).mockResolvedValue(mockQuestions);
    (createAlgotime as jest.Mock).mockResolvedValue({ success: true });
    (logFrontend as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
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

    test('does not show validation error initially', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByText('General Information')).toBeInTheDocument();
      });

      expect(screen.queryByText('Incomplete general information.')).not.toBeInTheDocument();
    });

    test('loads questions on mount', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(getQuestions).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    
    test('shows error when date is missing', async () => {
      render(<AlgoTimeSessionForm />);

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
      });
    });

    test('shows error when start time is missing', async () => {
      render(<AlgoTimeSessionForm />);

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
      });
    });

    test('shows error when end time is missing', async () => {
      render(<AlgoTimeSessionForm />);

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
      });
    });

    test('shows error for session in the past', async () => {
      render(<AlgoTimeSessionForm />);

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '12:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '13:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('The session must be scheduled for a future date and time.')).toBeInTheDocument();
      });
    });

    test('shows error when no questions are selected', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-01-20' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Please select at least one question for session 1.')).toBeInTheDocument();
      });
    });

    test('shows error when session has more than 6 questions', async () => {
      const manyQuestions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Question ${i + 1}`,
        difficulty: 'Easy',
        date: new Date('2024-01-01'),
        description: 'Test',
        media: '',
        preset_code: '',
        template_solution: '',
      }));

      (getQuestions as jest.Mock).mockResolvedValue(manyQuestions);

      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-01-20' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      // Select 7 questions
      for (let i = 1; i <= 7; i++) {
        const checkbox = screen.getByTestId(`question-1-${i}`);
        fireEvent.click(checkbox);
      }

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Session 1 has too many questions. Maximum is 6.')).toBeInTheDocument();
      });
    });

    test('shows error when repeat end date is missing', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Select weekly repeat
      const repeatSelect = screen.getByRole('combobox');
      fireEvent.click(repeatSelect);

      await waitFor(() => {
        const weeklyOptions = screen.getAllByText('Weekly');
        expect(weeklyOptions.length).toBeGreaterThan(0);
      });

      const weeklyOptions = screen.getAllByText('Weekly');
      fireEvent.click(weeklyOptions[weeklyOptions.length - 1]);

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Please provide an end date for repeat sessions.')).toBeInTheDocument();
      });
    });

    test('clears validation error after reset', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByText('Create')).toBeInTheDocument();
      });

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '' } });

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
  });

  describe('Question Selection', () => {
    test('toggles question selection', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('question-1-1')).toBeInTheDocument();
      });

      const checkbox = screen.getByTestId('question-1-1');

      // Toggle on
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });

      // Toggle off
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

  });

  describe('Form Submission', () => {
    test('submits form successfully with valid data', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-01-20' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createAlgotime).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
        expect(toast.success).toHaveBeenCalledWith('AlgoTime Session created successfully!');
      });
    });

    test('creates correct payload structure', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2025-01-20' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(createAlgotime).toHaveBeenCalledWith({
          seriesName: expect.stringContaining('AlgoTime Session'),
          questionCooldown: 300,
          sessions: expect.arrayContaining([
            expect.objectContaining({
              date: '2025-01-20',
              startTime: '14:00',
              endTime: '16:00',
              selectedQuestions: [1],
            }),
          ]),
        });
      });
    });

    test('disables submit button while submitting', async () => {
      (createAlgotime as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2025-01-20' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });

    test('handles submission error', async () => {
      (createAlgotime as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2025-01-20' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Failed to create session. Please try again.')).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Failed to create session');
      });
    });

    test('handles 409 conflict error', async () => {
      (createAlgotime as jest.Mock).mockRejectedValue({
        response: {
          status: 409,
          data: { detail: 'Series already exists' },
        },
      });

      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2025-01-20' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Series already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Repeat Sessions', () => {
    test('renders multiple sessions when repeat is weekly', async () => {
      render(<AlgoTimeSessionForm />);

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-02-08' } });

      const repeatSelect = screen.getByRole('combobox');
      fireEvent.click(repeatSelect);

      await waitFor(() => {
        const weeklyOptions = screen.getAllByText('Weekly');
        expect(weeklyOptions.length).toBeGreaterThan(0);
      });

      const weeklyOptions = screen.getAllByText('Weekly');
      fireEvent.click(weeklyOptions[weeklyOptions.length - 1]);

      await waitFor(() => {
        expect(screen.getByTestId('repeatEndDate')).toBeInTheDocument();
      });

      const endDateInput = screen.getByTestId('repeatEndDate');
      fireEvent.change(endDateInput, { target: { value: '2026-03-08' } });

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
        expect(screen.getByTestId('session-2')).toBeInTheDocument();
      });
    });

    test('calculates correct number of daily sessions', async () => {
      render(<AlgoTimeSessionForm />);

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-02-08' } });

      const repeatSelect = screen.getByRole('combobox');
      fireEvent.click(repeatSelect);

      await waitFor(() => {
        const dailyOptions = screen.getAllByText('Daily');
        expect(dailyOptions.length).toBeGreaterThan(0);
      });

      const dailyOptions = screen.getAllByText('Daily');
      fireEvent.click(dailyOptions[dailyOptions.length - 1]);

      await waitFor(() => {
        expect(screen.getByTestId('repeatEndDate')).toBeInTheDocument();
      });

      const endDateInput = screen.getByTestId('repeatEndDate');
      fireEvent.change(endDateInput, { target: { value: '2026-02-12' } }); // 5 days

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
        expect(screen.getByTestId('session-5')).toBeInTheDocument();
      });
    });

    test('switches to single session when repeat type changes to none', async () => {
      render(<AlgoTimeSessionForm />);

      // Set up weekly repeat
      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-02-08' } });

      const repeatSelect = screen.getByRole('combobox');
      fireEvent.click(repeatSelect);

      await waitFor(() => {
        const weeklyOptions = screen.getAllByText('Weekly');
        expect(weeklyOptions.length).toBeGreaterThan(0);
      });

      const weeklyOptions = screen.getAllByText('Weekly');
      fireEvent.click(weeklyOptions[weeklyOptions.length - 1]);

      await waitFor(() => {
        expect(screen.getByTestId('repeatEndDate')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('repeatEndDate'), { target: { value: '2026-03-08' } });

      await waitFor(() => {
        expect(screen.getByTestId('session-2')).toBeInTheDocument();
      });

      // Change back to none
      fireEvent.click(repeatSelect);

      await waitFor(() => {
        const noneOptions = screen.getAllByText('Does not repeat');
        expect(noneOptions.length).toBeGreaterThan(0);
      });

      const noneOptions = screen.getAllByText('Does not repeat');
      fireEvent.click(noneOptions[noneOptions.length - 1]);

      await waitFor(() => {
        expect(screen.queryByTestId('session-2')).not.toBeInTheDocument();
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });
    });
  });

  describe('Question Cooldown', () => {
    test('uses default cooldown of 300 when not specified', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2025-01-20' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(createAlgotime).toHaveBeenCalledWith(
          expect.objectContaining({
            questionCooldown: 300,
          })
        );
      });
    });

    test('uses custom cooldown when specified', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });

      const cooldownInput = screen.getByPlaceholderText('Optional') as HTMLInputElement;
      fireEvent.change(cooldownInput, { target: { value: '600' } });

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2025-01-20' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '16:00' } });
      fireEvent.change(screen.getByLabelText('Session Name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(createAlgotime).toHaveBeenCalledWith(
          expect.objectContaining({
            questionCooldown: 600,
          })
        );
      });
    });
  });
});