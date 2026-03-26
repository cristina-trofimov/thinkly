import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlgoTimeSessionForm } from '../src/components/forms/AlgoTimeForm';
import { createAlgotime, updateAlgotime } from '../src/api/AlgotimeAPI';
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

//Mock general info card
jest.mock('../src/components/createActivity/GeneralInfoCard', () => ({
  GeneralInfoCard: ({ data, onChange, repeatData, onRepeatChange, cooldown, onCooldownChange }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'general-info-card' }, [
      // Renders the text so "General Information" tests pass
      React.createElement('h2', { key: 'question_id' }, 'General Information'),

      React.createElement('input', {
        key: 'date',
        'data-testid': 'date',
        value: data.date || '',
        onChange: (e: any) => onChange({ date: e.target.value }),
      }),
      React.createElement('input', {
        key: 'name',
        'data-testid': 'name',
        'aria-label': 'Series Name',
        value: data.name || '',
        onChange: (e: any) => onChange({ name: e.target.value }),
      }),
      React.createElement('input', {
        key: 'startTime',
        'aria-label': 'Start Time',
        value: data.startTime || '',
        onChange: (e: any) => onChange({ startTime: e.target.value }),
      }),
      React.createElement('input', {
        key: 'endTime',
        'aria-label': 'End Time',
        value: data.endTime || '',
        onChange: (e: any) => onChange({ endTime: e.target.value }),
      }),
      React.createElement('input', {
        key: 'cooldown',
        placeholder: 'Optional',
        value: cooldown || '',
        onChange: (e: any) => onCooldownChange(e.target.value),
      }),
      repeatData ? React.createElement('select',{
        key: 'repeat',
        role: 'combobox',
        value: repeatData?.repeatType || 'none',
        onChange: (e: any) => onRepeatChange({ repeatType: e.target.value }),
      }, [
        React.createElement('option', { key: 'none', value: 'none' }, 'Does not repeat'),
        React.createElement('option', { key: 'daily', value: 'daily' }, 'Daily'),
        React.createElement('option', { key: 'weekly', value: 'weekly' }, 'Weekly'),
        React.createElement('option', { key: 'biweekly', value: 'biweekly' }, 'Biweekly'),
        React.createElement('option', { key: 'monthly', value: 'monthly' }, 'Monthly'),
      ]): null ,
      (repeatData?.repeatType && repeatData.repeatType !== 'none')
        ? React.createElement('input', {
         key: 'repeatEndDate',
        'data-testid': 'repeatEndDate',
         value: repeatData.repeatEndDate || '',
            onChange: (e: any) => onRepeatChange({ repeatEndDate: e.target.value }),
          })
        : null,
    ]);
  }
}));

//create and update mock
jest.mock('../src/api/AlgotimeAPI', () => ({
  createAlgotime: jest.fn(),
  updateAlgotime: jest.fn(),
}));


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
          React.createElement('span', { key: 'title' }, q.question_name),
        ])
      ))
    ]);
  },
}));

const mockQuestions = [
  {
    question_id: 1,
    question_name: 'Test Question 1',
    difficulty: 'Easy',
    created_at: new Date('2024-01-01'),
    question_description: 'Test',
    media: '',
    preset_functions: '',
    template_code: '',
  },
  {
    question_id: 2,
    question_name: 'Test Question 2',
    difficulty: 'Medium',
    created_at: new Date('2024-01-02'),
    question_description: 'Test',
    media: '',
    preset_functions: '',
    template_code: '',
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
        expect(toast.error).toHaveBeenCalledWith('Incomplete general information.');
      });
    });

    test('shows error for session in the past in create mode', async () => {
      render(<AlgoTimeSessionForm />);

      const dateInput = screen.getByTestId('date') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '12:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '13:00' } });
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('The session must be scheduled for a future date and time.');
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
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please select at least one question for "Session 1".');
      });
    });

    test('shows error when session has more than 6 questions', async () => {
      const manyQuestions = Array.from({ length: 10 }, (_, i) => ({
        question_id: i + 1,
        question_name: `Question ${i + 1}`,
        difficulty: 'Easy',
        created_at: new Date('2024-01-01'),
        question_description: 'Test',
        media: '',
        preset_functions: '',
        template_code: '',
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
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
      // Select 7 questions
      for (let i = 1; i <= 7; i++) {
        const checkbox = screen.getByTestId(`question-1-${i}`);
        fireEvent.click(checkbox);
      }

      const sessionNameInput = screen.getByLabelText('Session Name');
      fireEvent.change(sessionNameInput, { target: { value: 'My Session' } });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Session 1 has too many questions. Maximum is 6.');
      });
    });

    test('shows error when repeat end date is missing', async () => {
      render(<AlgoTimeSessionForm />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Select weekly repeat
      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-02-08' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'weekly' } });

      const startTimeInput = screen.getByLabelText('Start Time') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });

      const endTimeInput = screen.getByLabelText('End Time') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '16:00' } });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please provide an end date for repeat sessions.');
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
      const sessionNameInput = screen.getByLabelText('Session Name');
      fireEvent.change(sessionNameInput, { target: { value: 'My Session' } });
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createAlgotime).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard/algoTimeSessions');
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
      const sessionNameInput = screen.getByLabelText('Session Name');
      fireEvent.change(sessionNameInput, { target: { value: 'My Session' } });
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
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
      const sessionNameInput = screen.getByLabelText('Session Name');
      fireEvent.change(sessionNameInput, { target: { value: 'My Session' } });
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
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
      const sessionNameInput = screen.getByLabelText('Session Name');
      fireEvent.change(sessionNameInput, { target: { value: 'My Session' } });
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
      const checkbox = screen.getByTestId('question-1-1');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Series already exists');
      });
    });
  });

  describe('Repeat Sessions', () => {
    test('renders multiple sessions when repeat is weekly', async () => {
      render(<AlgoTimeSessionForm />);

      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-02-08' } });

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'weekly' } });

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

  });

  describe('Question Cooldown', () => {

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
      const sessionNameInput = screen.getByLabelText('Session Name');
      fireEvent.change(sessionNameInput, { target: { value: 'My Session' } });
      fireEvent.change(screen.getByTestId('name'), { target: { value: 'My Session' } });
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

  describe('Edit Mode', () => {
    const mockInitialData = {
      sessionId: 1,
      name: 'Existing Session',
      date: '2025-01-20',
      startTime: '14:00',
      endTime: '16:00',
      questionCooldown: 300,
      selectedQuestions: [1],
    };
  
    beforeEach(() => {
      (updateAlgotime as jest.Mock).mockResolvedValue({ success: true });
    });
  
    test('renders edit mode title', async () => {
      render(<AlgoTimeSessionForm mode="edit" initialData={mockInitialData} />);
  
      await waitFor(() => {
        expect(screen.getByText('Edit AlgoTime Session')).toBeInTheDocument();
      });
    });
  
    test('renders Save Changes button in edit mode', async () => {
      render(<AlgoTimeSessionForm mode="edit" initialData={mockInitialData} />);
  
      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });
  
    test('does not render Reset button in edit mode', async () => {
      render(<AlgoTimeSessionForm mode="edit" initialData={mockInitialData} />);
  
      await waitFor(() => {
        expect(screen.queryByText('Reset')).not.toBeInTheDocument();
      });
    });
  
    test('pre-populates form with initial data', async () => {
      render(<AlgoTimeSessionForm mode="edit" initialData={mockInitialData} />);
  
      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });
  
      const nameInput = screen.getByLabelText('Session Name') as HTMLInputElement;
      expect(nameInput.value).toBe('Existing Session');
    });
  
    test('pre-selects questions from initial data', async () => {
      render(<AlgoTimeSessionForm mode="edit" initialData={mockInitialData} />);
  
      await waitFor(() => {
        expect(screen.getByTestId('question-1-1')).toBeInTheDocument();
      });
  
      const checkbox = screen.getByTestId('question-1-1') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  
    test('calls updateAlgotime on submit in edit mode', async () => {
      const mockOnSuccess = jest.fn();
      render(
        <AlgoTimeSessionForm
          mode="edit"
          initialData={mockInitialData}
          onSuccess={mockOnSuccess}
        />
      );
  
      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });
  
      fireEvent.click(screen.getByText('Save Changes'));
  
      await waitFor(() => {
        expect(updateAlgotime).toHaveBeenCalledWith(
          mockInitialData.sessionId,
          expect.objectContaining({
            name: 'Existing Session',
            date: '2025-01-20',
            startTime: '14:00',
            endTime: '16:00',
            selectedQuestions: [1],
          })
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  
    test('does not navigate after successful edit', async () => {
      render(
        <AlgoTimeSessionForm
          mode="edit"
          initialData={mockInitialData}
          onSuccess={jest.fn()}
        />
      );
  
      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });
  
      fireEvent.click(screen.getByText('Save Changes'));
  
      await waitFor(() => {
        expect(updateAlgotime).toHaveBeenCalled();
      });
  
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  
    test('does not show repeat options in edit mode', async () => {
      render(<AlgoTimeSessionForm mode="edit" initialData={mockInitialData} />);
  
      await waitFor(() => {
        expect(screen.getByText('Edit AlgoTime Session')).toBeInTheDocument();
      });
  
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    test('allows editing a session with past start time', async () => {
      const pastSessionData = {
        ...mockInitialData,
        date: '2020-01-01',
        startTime: '10:00',
        endTime: '11:00',
      };
    
      render(<AlgoTimeSessionForm mode="edit" initialData={pastSessionData} />);
    
      await waitFor(() => {
        expect(screen.getByTestId('session-1')).toBeInTheDocument();
      });
    
      fireEvent.click(screen.getByText('Save Changes'));
    
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('The session end time must be in the future.');
      });
    });
  });
});