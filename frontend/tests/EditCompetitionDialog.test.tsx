import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditCompetitionDialog from '../src/components/manageCompetitions/EditCompetitionDialog';
import { updateCompetition, getCompetitionById } from '../src/api/CompetitionAPI';
import { getQuestions, getRiddles } from '../src/api/QuestionsAPI';
import { logFrontend } from '../src/api/LoggerAPI';

// Mock the API modules
jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/QuestionsAPI');
jest.mock('../src/api/LoggerAPI');

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

const mockUpdateCompetition = updateCompetition as jest.MockedFunction<typeof updateCompetition>;
const mockGetCompetitionById = getCompetitionById as jest.MockedFunction<typeof getCompetitionById>;
const mockGetQuestions = getQuestions as jest.MockedFunction<typeof getQuestions>;
const mockGetRiddles = getRiddles as jest.MockedFunction<typeof getRiddles>;
const mockLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

describe('EditCompetitionDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();
  const competitionId = 2;

  const mockQuestions = [
    { id: 1, title: 'Two Sum', difficulty: 'Easy' as const, date: new Date('2024-01-01') },
    { id: 2, title: 'Binary Search', difficulty: 'Medium' as const, date: new Date('2024-01-02') },
    { id: 3, title: 'Graph Traversal', difficulty: 'Hard' as const, date: new Date('2024-01-03') },
  ];

  const mockRiddles = [
    { id: 1, question: 'What has keys but no locks?', answer: 'A keyboard', file: null },
    { id: 2, question: 'I speak without a mouth and hear without ears.', answer: 'An echo', file: null },
    { id: 3, question: 'The more you take, the more you leave behind.', answer: 'Footsteps', file: null },
  ];

  const mockCompetitionData = {
    competitionTitle: 'Winter Hackathon 2024',
    date: '2024-12-15',
    startTime: '09:00',
    endTime: '17:00',
    competitionLocation: 'Building A, Room 101',
    questionCooldownTime: 300,
    riddleCooldownTime: 60,
    selectedQuestions: [1, 2],
    selectedRiddles: [1, 2],
    emailNotification: {
      to: 'test@example.com',
      subject: 'Competition Reminder',
      body: 'Don\'t forget about the competition!',
      sendAtLocal: '2024-12-14T18:00',
      sendInOneMinute: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetQuestions.mockResolvedValue(mockQuestions);
    mockGetRiddles.mockResolvedValue(mockRiddles);
    mockGetCompetitionById.mockResolvedValue(mockCompetitionData);
  });

  describe('Initial Rendering', () => {
    it('should show loading state initially', () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      expect(screen.getByText('Loading competition data...')).toBeInTheDocument();
    });

    it('should load and display competition data', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Winter Hackathon 2024')).toBeInTheDocument();
      });

      expect(mockGetCompetitionById).toHaveBeenCalledWith(competitionId);
      expect(mockGetQuestions).toHaveBeenCalled();
      expect(mockGetRiddles).toHaveBeenCalled();
    });

    it('should not load data when dialog is closed', () => {
      render(
        <EditCompetitionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      expect(mockGetCompetitionById).not.toHaveBeenCalled();
    });
  });

  describe('Form Fields', () => {
    it('should populate form fields with competition data', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Winter Hackathon 2024')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('2024-12-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Building A, Room 101')).toBeInTheDocument();
      expect(screen.getByDisplayValue('300')).toBeInTheDocument();
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    });

    it('should update form fields on user input', async () => {
      const user = userEvent.setup();
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Winter Hackathon 2024')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Spring Hackathon 2025');

      expect(screen.getByDisplayValue('Spring Hackathon 2025')).toBeInTheDocument();
    });
  });

  describe('Questions and Riddles Management', () => {
    it('should display selected questions', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument();
        expect(screen.getByText('Binary Search')).toBeInTheDocument();
      });
    });

    it('should filter questions by search query', async () => {
      const user = userEvent.setup();
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search available problems...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search available problems...');
      await user.type(searchInput, 'Graph');

      await waitFor(() => {
        expect(screen.getByText('Graph Traversal')).toBeInTheDocument();
      });
    });
  });

  describe('Email Notifications', () => {
    it('should toggle email notifications', async () => {
      const user = userEvent.setup();
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Enable Emails')).toBeInTheDocument();
      });

      const emailSwitch = screen.getByLabelText('Enable Emails');
      await user.click(emailSwitch);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('test@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        competitionTitle: '',
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(await screen.findByText('Incomplete general information.')).toBeInTheDocument();
    });

    it('should show error when no questions selected', async () => {
      const user = userEvent.setup();
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        selectedQuestions: [],
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(await screen.findByText('Please select at least one question.')).toBeInTheDocument();
    });

    it('should show error when questions and riddles count mismatch', async () => {
      const user = userEvent.setup();
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        selectedQuestions: [1, 2],
        selectedRiddles: [1],
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(await screen.findByText('You must have the same number of questions and riddles.')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit form with valid data', async () => {
      const user = userEvent.setup();
      mockUpdateCompetition.mockResolvedValue(undefined);

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateCompetition).toHaveBeenCalledWith(
          expect.objectContaining({
            id: competitionId,
            name: 'Winter Hackathon 2024',
            date: '2024-12-15',
            startTime: '09:00',
            endTime: '17:00',
          })
        );
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should handle submission error', async () => {
      const user = userEvent.setup();
      const error = new Error('Network error');
      mockUpdateCompetition.mockRejectedValue(error);

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update competition. Please try again.')).toBeInTheDocument();
      });

      expect(mockLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ERROR',
          message: 'Failed to update competition: Network error',
        })
      );
    });

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup();
      mockUpdateCompetition.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API error when loading data', async () => {
      const error = new Error('Failed to fetch');
      mockGetCompetitionById.mockRejectedValue(error);

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load competition data. Please try again.')).toBeInTheDocument();
      });

      expect(mockLogFrontend).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ERROR',
          message: 'Failed to load competition data: Failed to fetch',
        })
      );
    });
  });

  describe('Cancel Functionality', () => {
    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});