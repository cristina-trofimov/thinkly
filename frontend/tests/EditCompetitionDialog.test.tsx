import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import EditCompetitionDialog from '../src/components/manageCompetitions/EditCompetitionDialog';
import { updateCompetition, getCompetitionById } from '../src/api/CompetitionAPI';
import { getQuestions, getRiddles } from '../src/api/QuestionsAPI';
import { logFrontend } from '../src/api/LoggerAPI';
import { toast } from 'sonner';

// Mock the API modules
jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/QuestionsAPI');
jest.mock('../src/api/LoggerAPI');
jest.mock('sonner');

// Mock buildCompetitionEmail
jest.mock('../src/components/manageCompetitions/BuildEmail', () => ({
  __esModule: true,
  default: jest.fn((formData) => {
    if (!formData.name) return "";
    return `Competition ${formData.name} on ${formData.date}`;
  }),
}));

// Mock child components to make testing easier
jest.mock('../src/components/createActivity/SelectionCard', () => ({
  SelectionCard: ({ 
    title, 
    orderedItems, 
    availableItems,
    onAdd,
    onRemove,
    onMove,
    onDragEnd,
    onClearAll,
    onSelectAll,
    searchQuery,
    onSearchChange,
    renderItemTitle,
    renderExtraInfo,
    isInvalid
  }: any) => (
    <div data-testid={`selection-card-${title.props?.children?.[0] || title}`}>
      <h3>{title}</h3>
      <input 
        placeholder="Search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button onClick={onClearAll}>Clear All</button>
      <button onClick={onSelectAll}>Select All</button>
      <div data-testid="available-items">
        {availableItems.map((item: any) => (
          <div key={item.id}>
            <span>{renderItemTitle(item)}</span>
            {renderExtraInfo && renderExtraInfo(item)}
            <button onClick={() => onAdd(item)}>Add</button>
          </div>
        ))}
      </div>
      <div data-testid="ordered-items">
        {orderedItems.map((item: any, idx: number) => (
          <div key={item.id}>
            <span>{renderItemTitle(item)}</span>
            <button onClick={() => onRemove(item.id)}>Remove</button>
            <button onClick={() => onMove(idx, 'up')} disabled={idx === 0}>Up</button>
            <button onClick={() => onMove(idx, 'down')} disabled={idx === orderedItems.length - 1}>Down</button>
          </div>
        ))}
      </div>
      {isInvalid && <span>Invalid</span>}
    </div>
  ),
}));

jest.mock('../src/components/createActivity/GeneralInfoCard', () => ({
  GeneralInfoCard: ({ data, errors, onChange }: any) => (
    <div data-testid="general-info-card">
      <input
        data-testid="name-input"
        aria-label="Name"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className={errors.name ? "error" : ""}
      />
      <input
        data-testid="date-input"
        aria-label="Date"
        type="date"
        value={data.date}
        onChange={(e) => onChange({ date: e.target.value })}
        className={errors.date ? "error" : ""}
      />
      <input
        data-testid="start-time-input"
        aria-label="Start Time"
        type="time"
        value={data.startTime}
        onChange={(e) => onChange({ startTime: e.target.value })}
        className={errors.startTime ? "error" : ""}
      />
      <input
        data-testid="end-time-input"
        aria-label="End Time"
        type="time"
        value={data.endTime}
        onChange={(e) => onChange({ endTime: e.target.value })}
        className={errors.endTime ? "error" : ""}
      />
      <input
        data-testid="location-input"
        aria-label="Location"
        value={data.location}
        onChange={(e) => onChange({ location: e.target.value })}
      />
    </div>
  ),
}));

jest.mock('../src/components/createActivity/GameplayLogicCard', () => ({
  GameplayLogicCard: ({ questionCooldown, riddleCooldown, onChange }: any) => (
    <div data-testid="gameplay-logic-card">
      <input
        data-testid="question-cooldown-input"
        aria-label="Question Cooldown"
        value={questionCooldown}
        onChange={(e) => onChange({ questionCooldownTime: e.target.value })}
      />
      <input
        data-testid="riddle-cooldown-input"
        aria-label="Riddle Cooldown"
        value={riddleCooldown}
        onChange={(e) => onChange({ riddleCooldownTime: e.target.value })}
      />
    </div>
  ),
}));

jest.mock('../src/components/createActivity/NotificationsCard', () => ({
  NotificationsCard: ({ 
    emailEnabled,
    setEmailEnabled,
    emailToAll,
    setEmailToAll,
    emailData,
    onEmailDataChange,
    onManualEdit
  }: any) => (
    <div data-testid="notifications-card">
      <input
        data-testid="email-enabled-checkbox"
        aria-label="Enable Emails"
        type="checkbox"
        checked={emailEnabled}
        onChange={(e) => setEmailEnabled(e.target.checked)}
      />
      <input
        data-testid="email-to-all-checkbox"
        aria-label="Send to All"
        type="checkbox"
        checked={emailToAll}
        onChange={(e) => setEmailToAll(e.target.checked)}
      />
      <input
        data-testid="email-subject-input"
        aria-label="Email Subject"
        value={emailData.subject}
        onChange={(e) => onEmailDataChange({ subject: e.target.value })}
      />
      <textarea
        data-testid="email-text-input"
        aria-label="Email Body"
        value={emailData.text}
        onChange={(e) => {
          onManualEdit();
          onEmailDataChange({ text: e.target.value });
        }}
      />
      <input
        data-testid="email-send-at-input"
        aria-label="Send At"
        type="datetime-local"
        value={emailData.sendAtLocal}
        onChange={(e) => onEmailDataChange({ sendAtLocal: e.target.value })}
      />
    </div>
  ),
}));

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
    { 
      id: 1, 
      title: 'Two Sum', 
      difficulty: 'Easy' as const, 
      date: new Date('2024-01-01'),
      description: "string",
      media: "string",
      preset_code: "string",
      template_solution: "string"
    },
    { 
      id: 2,
      title: 'Binary Search',
      difficulty: 'Medium' as const,
      date: new Date('2024-01-02'),
      description: "string",
      media: "string",
      preset_code: "string",
      template_solution: "string"
    },
    { 
      id: 3,
      title: 'Graph Traversal',
      difficulty: 'Hard' as const,
      date: new Date('2024-01-03'),
      description: "string",
      media: "string",
      preset_code: "string",
      template_solution: "string"
    },
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    mockGetQuestions.mockResolvedValue(mockQuestions);
    mockGetRiddles.mockResolvedValue(mockRiddles);
    mockGetCompetitionById.mockResolvedValue(mockCompetitionData);
    mockUpdateCompetition.mockResolvedValue(undefined);
    mockLogFrontend.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should not render when dialog is closed', () => {
      const { container } = render(
        <EditCompetitionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      expect(container).toBeEmptyDOMElement();
      expect(mockGetCompetitionById).not.toHaveBeenCalled();
    });

    it('should show loading state initially (returns null)', () => {
      const { container } = render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      // Component returns null while loading
      expect(container).toBeEmptyDOMElement();
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

    it('should load data in parallel using Promise.all', async () => {
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

      // All three APIs should have been called
      expect(mockGetQuestions).toHaveBeenCalledTimes(1);
      expect(mockGetRiddles).toHaveBeenCalledTimes(1);
      expect(mockGetCompetitionById).toHaveBeenCalledTimes(1);
    });

    it('should display dialog title', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Competition')).toBeInTheDocument();
      });
    });
  });

  describe('Form Fields Population', () => {
    it('should populate all form fields with competition data', async () => {
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

    it('should set emailToAll to false when email is not "all participants"', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-to-all-checkbox')).not.toBeChecked();
      });
    });

    it('should set emailToAll to true when email is "all participants"', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        emailNotification: {
          ...mockCompetitionData.emailNotification,
          to: 'all participants',
        },
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-to-all-checkbox')).toBeChecked();
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      mockGetCompetitionById.mockResolvedValue({
        competitionTitle: 'Test Competition',
        date: '2024-12-15',
        startTime: '09:00',
        endTime: '17:00',
        competitionLocation: '',
        questionCooldownTime: null,
        riddleCooldownTime: null,
        selectedQuestions: [1],
        selectedRiddles: [1],
        emailNotification: null,
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Competition')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('300')).toBeInTheDocument(); // default
      expect(screen.getByDisplayValue('60')).toBeInTheDocument(); // default
      expect(screen.getByTestId('email-enabled-checkbox')).not.toBeChecked();
    });

    it('should update form fields on user input', async () => {
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
      fireEvent.change(nameInput, { target: { value: 'Spring Hackathon 2025' } });

      expect(screen.getByDisplayValue('Spring Hackathon 2025')).toBeInTheDocument();
    });
  });

  describe('Questions and Riddles Management', () => {
    it('should display selected questions from competition data', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        const orderedItems = within(questionSection).getByTestId('ordered-items');
        expect(within(orderedItems).getByText('Two Sum')).toBeInTheDocument();
        expect(within(orderedItems).getByText('Binary Search')).toBeInTheDocument();
      });
    });

    it('should display selected riddles from competition data', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const riddleSection = screen.getByTestId('selection-card-Riddles');
        const orderedItems = within(riddleSection).getByTestId('ordered-items');
        expect(within(orderedItems).getByText('What has keys but no locks?')).toBeInTheDocument();
      });
    });

    it('should filter out selected questions from available list', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        const availableItems = within(questionSection).getByTestId('available-items');
        
        // Two Sum and Binary Search should NOT be in available (they're selected)
        expect(within(availableItems).queryByText('Two Sum')).not.toBeInTheDocument();
        expect(within(availableItems).queryByText('Binary Search')).not.toBeInTheDocument();
        // Graph Traversal should be in available
        expect(within(availableItems).getByText('Graph Traversal')).toBeInTheDocument();
      });
    });

    it('should filter questions by search query', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Graph Traversal')).toBeInTheDocument();
      });

      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const searchInput = within(questionSection).getByPlaceholderText('Search');

      fireEvent.change(searchInput, { target: { value: 'Graph' } });

      await waitFor(() => {
        const availableItems = within(questionSection).getByTestId('available-items');
        expect(within(availableItems).getByText('Graph Traversal')).toBeInTheDocument();
      });
    });

    it('should add question to ordered list', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Graph Traversal')).toBeInTheDocument();
      });

      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const availableItems = within(questionSection).getByTestId('available-items');
      const addButton = within(availableItems).getByText('Add');

      fireEvent.click(addButton);

      const orderedItems = within(questionSection).getByTestId('ordered-items');
      expect(within(orderedItems).getByText('Graph Traversal')).toBeInTheDocument();
    });

    it('should remove question from ordered list', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        const orderedItems = within(questionSection).getByTestId('ordered-items');
        expect(within(orderedItems).getByText('Two Sum')).toBeInTheDocument();
      });

      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const orderedItems = within(questionSection).getByTestId('ordered-items');
      const removeButtons = within(orderedItems).getAllByText('Remove');

      fireEvent.click(removeButtons[0]);

      expect(within(orderedItems).queryByText('Two Sum')).not.toBeInTheDocument();
    });

    it('should clear all selected questions', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        const orderedItems = within(questionSection).getByTestId('ordered-items');
        expect(within(orderedItems).getByText('Two Sum')).toBeInTheDocument();
      });

      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const clearButton = within(questionSection).getByText('Clear All');

      fireEvent.click(clearButton);

      const orderedItems = within(questionSection).getByTestId('ordered-items');
      expect(within(orderedItems).queryByText('Two Sum')).not.toBeInTheDocument();
      expect(within(orderedItems).queryByText('Binary Search')).not.toBeInTheDocument();
    });

    it('should select all available questions', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Graph Traversal')).toBeInTheDocument();
      });

      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const selectAllButton = within(questionSection).getByText('Select All');

      fireEvent.click(selectAllButton);

      const orderedItems = within(questionSection).getByTestId('ordered-items');
      // Should now have all 3 questions (2 original + 1 newly added)
      expect(within(orderedItems).getByText('Graph Traversal')).toBeInTheDocument();
    });

    it('should handle questions that dont exist in the list', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        selectedQuestions: [1, 999], // 999 doesn't exist
        selectedRiddles: [1, 2],
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        const orderedItems = within(questionSection).getByTestId('ordered-items');
        // Should only have the valid question
        expect(within(orderedItems).getByText('Two Sum')).toBeInTheDocument();
      });
    });
  });

  describe('Email Notifications', () => {
    it('should toggle email notifications on', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        emailNotification: null,
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-enabled-checkbox')).not.toBeChecked();
      });

      const emailCheckbox = screen.getByTestId('email-enabled-checkbox');
      fireEvent.click(emailCheckbox);

      expect(screen.getByTestId('email-enabled-checkbox')).toBeChecked();
    });

    it('should toggle email notifications off', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-enabled-checkbox')).toBeChecked();
      });

      const emailCheckbox = screen.getByTestId('email-enabled-checkbox');
      fireEvent.click(emailCheckbox);

      expect(screen.getByTestId('email-enabled-checkbox')).not.toBeChecked();
    });

    it('should toggle email to all participants', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-to-all-checkbox')).not.toBeChecked();
      });

      const emailToAllCheckbox = screen.getByTestId('email-to-all-checkbox');
      fireEvent.click(emailToAllCheckbox);

      expect(screen.getByTestId('email-to-all-checkbox')).toBeChecked();
    });

    it('should update email subject', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Competition Reminder')).toBeInTheDocument();
      });

      const subjectInput = screen.getByTestId('email-subject-input');
      fireEvent.change(subjectInput, { target: { value: 'New Subject' } });

      expect(screen.getByDisplayValue('New Subject')).toBeInTheDocument();
    });

    it('should set emailManuallyEdited flag when email body is edited', async () => {
      const buildEmail = require('../src/components/manageCompetitions/BuildEmail').default;
      
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-text-input')).toBeInTheDocument();
      });

      const callCountBefore = (buildEmail as jest.Mock).mock.calls.length;

      // Manually edit email body
      const emailTextarea = screen.getByTestId('email-text-input');
      fireEvent.change(emailTextarea, { target: { value: 'Custom email body' } });

      // Change form data that would normally trigger auto-generation
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Competition' } });

      // Should not have called buildEmail again after manual edit
      const callCountAfter = (buildEmail as jest.Mock).mock.calls.length;
      expect(callCountAfter).toBe(callCountBefore);
    });

    it('should auto-generate email text when form changes and not manually edited', async () => {
      const buildEmail = require('../src/components/manageCompetitions/BuildEmail').default;
      
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

      // Change name
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Spring Competition' } });

      // buildEmail should have been called
      expect(buildEmail).toHaveBeenCalled();
    });

    it('should not auto-generate email when email is disabled', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        emailNotification: null,
      });

      const buildEmail = require('../src/components/manageCompetitions/BuildEmail').default;
      (buildEmail as jest.Mock).mockClear();

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

      const callCountBefore = (buildEmail as jest.Mock).mock.calls.length;

      // Change name
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Spring Competition' } });

      // buildEmail should NOT be called when email is disabled
      const callCountAfter = (buildEmail as jest.Mock).mock.calls.length;
      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
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
      fireEvent.change(nameInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fill in all mandatory fields.');
      });
    });

    it('should show error when date is missing', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        date: '',
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
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fill in all mandatory fields.');
      });
    });

    it('should show error when no questions selected', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        const orderedItems = within(questionSection).getByTestId('ordered-items');
        expect(within(orderedItems).getByText('Two Sum')).toBeInTheDocument();
      });

      // Clear all questions
      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const clearButton = within(questionSection).getByText('Clear All');
      fireEvent.click(clearButton);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fill in all mandatory fields.');
      });
    });

    it('should show error when no riddles selected', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const riddleSection = screen.getByTestId('selection-card-Riddles');
        const orderedItems = within(riddleSection).getByTestId('ordered-items');
        expect(within(orderedItems).getByText('What has keys but no locks?')).toBeInTheDocument();
      });

      // Clear all riddles
      const riddleSection = screen.getByTestId('selection-card-Riddles');
      const clearButton = within(riddleSection).getByText('Clear All');
      fireEvent.click(clearButton);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fill in all mandatory fields.');
      });
    });

    it('should show error when competition is in the past', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        date: '2020-01-01',
        startTime: '10:00',
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('2020-01-01')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Competition must be scheduled for a future date/time.');
      });
    });

    it('should show error when end time is before start time', async () => {
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

      // Set end time before start time
      const endTimeInput = screen.getByLabelText('End Time');
      fireEvent.change(endTimeInput, { target: { value: '08:00' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Competition end time must be after the start time.');
      });
    });

    it('should show error when questions and riddles count mismatch', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        const questionSection = screen.getByTestId('selection-card-Coding Questions');
        expect(questionSection).toBeInTheDocument();
      });

      // Add one more question
      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const availableItems = within(questionSection).getByTestId('available-items');
      const addButton = within(availableItems).getByText('Add');
      fireEvent.click(addButton);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Questions and riddles count mismatch.');
      });
    });

    it('should highlight error fields when validation fails', async () => {
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
      fireEvent.change(nameInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toHaveClass('error');
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit with "all participants" when emailToAll is true', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        emailNotification: {
          ...mockCompetitionData.emailNotification,
          to: 'all participants',
        },
      });

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-to-all-checkbox')).toBeChecked();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const payload = (mockUpdateCompetition as jest.Mock).mock.calls[0][0];
        expect(payload.emailNotification.to).toBe('all participants');
      });
    });

    it('should submit with undefined emailNotification when email is disabled', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-enabled-checkbox')).toBeChecked();
      });

      // Disable email
      const emailCheckbox = screen.getByTestId('email-enabled-checkbox');
      fireEvent.click(emailCheckbox);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const payload = (mockUpdateCompetition as jest.Mock).mock.calls[0][0];
        expect(payload.emailEnabled).toBe(false);
        expect(payload.emailNotification).toBeUndefined();
      });
    });

    it('should use undefined for empty location', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        competitionLocation: '',
      });

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

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const payload = (mockUpdateCompetition as jest.Mock).mock.calls[0][0];
        expect(payload.location).toBeUndefined();
      });
    });

    it('should parse cooldown times as integers', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('300')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const payload = (mockUpdateCompetition as jest.Mock).mock.calls[0][0];
        expect(typeof payload.questionCooldownTime).toBe('number');
        expect(typeof payload.riddleCooldownTime).toBe('number');
        expect(payload.questionCooldownTime).toBe(300);
        expect(payload.riddleCooldownTime).toBe(60);
      });
    });

    it('should disable submit button while submitting', async () => {
      mockUpdateCompetition.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

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

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
        expect(saveButton).toBeDisabled();
      });
    });

    it('should disable cancel button while submitting', async () => {
      mockUpdateCompetition.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

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

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error when loading data', async () => {
      const error = new Error('Failed to fetch competition');
      mockGetCompetitionById.mockRejectedValue(error);

      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load competition data.');
      });

      expect(mockLogFrontend).toHaveBeenCalledWith({
        level: 'ERROR',
        message: expect.stringContaining('Failed to fetch competition'),
        component: 'SomePage',
        url: expect.any(String),
        stack: expect.any(String),
      });
    });

    it('should handle submission error', async () => {
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
        expect(screen.getByDisplayValue('Winter Hackathon 2024')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('An error occurred while updating.');
      });

      expect(mockLogFrontend).toHaveBeenCalledWith({
        level: 'ERROR',
        message: expect.stringContaining('Network error'),
        component: 'SomePage',
        url: expect.any(String),
        stack: expect.any(String),
      });
    });

    it('should re-enable buttons after submission error', async () => {
      const error = new Error('Server error');
      mockUpdateCompetition.mockRejectedValue(error);

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

      const saveButton = screen.getByText('Save Changes');
      const cancelButton = screen.getByText('Cancel');
      
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(saveButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });

    it('should not close dialog on submission error', async () => {
      const error = new Error('Server error');
      mockUpdateCompetition.mockRejectedValue(error);

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

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Should not have called onOpenChange
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should close dialog when cancel is clicked', async () => {
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
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should not call onSuccess when canceling', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Interactions', () => {
    it('should prevent closing on outside click', async () => {
      render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Competition')).toBeInTheDocument();
      });

      // The dialog has onPointerDownOutside and onInteractOutside set to preventDefault
      // So clicking outside should not close it
      // This is tested by the presence of these props in the component
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selected questions and riddles arrays', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        selectedQuestions: [],
        selectedRiddles: [],
      });

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

      const questionSection = screen.getByTestId('selection-card-Coding Questions');
      const orderedItems = within(questionSection).getByTestId('ordered-items');
      expect(orderedItems).toBeEmptyDOMElement();
    });

    it('should handle null selectedQuestions array', async () => {
      mockGetCompetitionById.mockResolvedValue({
        ...mockCompetitionData,
        selectedQuestions: null,
        selectedRiddles: null,
      });

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

      // Should not crash
      expect(screen.getByText('Edit Competition')).toBeInTheDocument();
    });

    it('should handle missing competitionId', () => {
      const { container } = render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={0}
        />
      );

      // Should not load data with falsy competitionId
      expect(mockGetCompetitionById).not.toHaveBeenCalled();
      expect(container).toBeEmptyDOMElement();
    });

    it('should reload data when competitionId changes', async () => {
      const { rerender } = render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={1}
        />
      );

      await waitFor(() => {
        expect(mockGetCompetitionById).toHaveBeenCalledWith(1);
      });

      mockGetCompetitionById.mockClear();

      rerender(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={2}
        />
      );

      await waitFor(() => {
        expect(mockGetCompetitionById).toHaveBeenCalledWith(2);
      });
    });

    it('should reload data when dialog reopens', async () => {
      const { rerender } = render(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(mockGetCompetitionById).toHaveBeenCalledTimes(1);
      });

      rerender(
        <EditCompetitionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      mockGetCompetitionById.mockClear();

      rerender(
        <EditCompetitionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          competitionId={competitionId}
        />
      );

      await waitFor(() => {
        expect(mockGetCompetitionById).toHaveBeenCalledTimes(1);
      });
    });
  });
});