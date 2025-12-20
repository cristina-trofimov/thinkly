jest.mock('../src/config', () => ({
  getBackendUrl: jest.fn(() => 'http://localhost:3000'),
}));


import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCompetitionDialog from '../src/components/manageCompetitions/CreateCompetitionDialog';
import * as QuestionsAPI from '../src/api/QuestionsAPI';
import * as CompetitionAPI from '../src/api/CompetitionAPI';

// --- Mocks ---

// Mock the API modules with correct paths
jest.mock('../src/api/QuestionsAPI');
jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn(),
}));

// Mock the UI component icons
jest.mock('@tabler/icons-react', () => ({
  IconPlus: () => <span data-testid="icon-plus" />,
  IconSearch: () => <span data-testid="icon-search" />,
  IconX: () => <span data-testid="icon-x" />,
  IconArrowUp: () => <span data-testid="icon-arrow-up" />,
  IconArrowDown: () => <span data-testid="icon-arrow-down" />,
}));

// Mock Data
const mockQuestions = [
  { id: '101', title: 'Binary Tree Search', difficulty: 'Medium' },
  { id: '102', title: 'Graph Traversal', difficulty: 'Hard' },
  { id: '103', title: 'Array Sorting', difficulty: 'Easy' },
];

const mockRiddles = [
  { id: '201', question: "Where's Waldo?" },
  { id: '202', question: "What has keys but no locks?" },
  { id: '203', question: "I speak without a mouth" },
  { id: '204', question: "The more you take, the more you leave behind" },
  { id: '205', question: "What can travel around the world?" },
  { id: '206', question: "What gets wetter as it dries?" },
];

describe('CreateCompetitionDialog', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks to return promises
    (QuestionsAPI.getQuestions as jest.Mock).mockResolvedValue(mockQuestions);
    (QuestionsAPI.getRiddles as jest.Mock).mockResolvedValue(mockRiddles);
    (CompetitionAPI.createCompetition as jest.Mock).mockResolvedValue({ success: true });
  });

  const renderComponent = (open = true) => {
    return render(
      <CreateCompetitionDialog open={open} onOpenChange={mockOnOpenChange} />
    );
  };

  test('renders dialog content when open', async () => {
    renderComponent();

    expect(screen.getByText('Create New Competition')).toBeInTheDocument();
    expect(screen.getByLabelText(/Competition Name/i)).toBeInTheDocument();

    // Check if APIs were called to load questions and riddles
    expect(QuestionsAPI.getQuestions).toHaveBeenCalledTimes(1);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText('Binary Tree Search')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('filters questions based on search query', async () => {
    renderComponent();

    // Wait for questions to load first
    await waitFor(() => {
      expect(screen.getByText('Binary Tree Search')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search questions to add...');
    const user = userEvent.setup();

    // Type "Graph"
    await user.clear(searchInput);
    await user.type(searchInput, 'Graph');

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText('Graph Traversal')).toBeInTheDocument();
      expect(screen.queryByText('Binary Tree Search')).not.toBeInTheDocument();
    });
  });

  test('validates form: shows error for missing fields', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for component to be ready
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Competition/i })).toBeInTheDocument();
    });

    // Click submit without filling anything
    const submitBtn = screen.getByRole('button', { name: /Create Competition/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Incomplete general information/i)).toBeInTheDocument();
    });
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  test('validates form: shows error for past dates', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for form to be ready
    await waitFor(() => {
      expect(screen.getByLabelText(/Competition Name/i)).toBeInTheDocument();
    });

    // Fill basic info
    await user.type(screen.getByLabelText(/Competition Name/i), 'Past Event');

    // Set a date in the past (e.g., year 2000)
    const dateInput = screen.getByLabelText(/Date/i);
    fireEvent.change(dateInput, { target: { value: '2000-01-01' } });

    const startInput = screen.getByLabelText(/Start Time/i);
    fireEvent.change(startInput, { target: { value: '10:00' } });

    const endInput = screen.getByLabelText(/End Time/i);
    fireEvent.change(endInput, { target: { value: '12:00' } });

    const submitBtn = screen.getByRole('button', { name: /Create Competition/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/must be scheduled for a future date/i)).toBeInTheDocument();
    });
  });

  test('validates form: shows error when no question/riddle selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for form to be ready
    await waitFor(() => {
      expect(screen.getByLabelText(/Competition Name/i)).toBeInTheDocument();
    });

    // Helper to get a future date string YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Fill General Info
    await user.type(screen.getByLabelText(/Competition Name/i), 'Valid Event');
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '12:00' } });

    // Attempt submit (No questions/riddles selected)
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    // Should complain about questions first
    await waitFor(() => {
      expect(screen.getByText(/Please select at least one question/i)).toBeInTheDocument();
    });

    // Wait for questions to load and select one
    await waitFor(() => {
      expect(screen.getByText('Binary Tree Search')).toBeInTheDocument();
    });

    // Click on the question to add it
    await user.click(screen.getByText('Binary Tree Search'));

    // Attempt submit again
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please select at least one riddle/i)).toBeInTheDocument();
    });
  });

  test('submits successfully with valid data', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for questions and riddles to load
    await waitFor(() => {
      expect(screen.getByText('Binary Tree Search')).toBeInTheDocument();
      expect(screen.getByText("Where's Waldo?")).toBeInTheDocument();
    });

    // 1. Setup Data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // 2. Fill Form
    await user.type(screen.getByLabelText(/Competition Name/i), 'Grand Prix');
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '16:00' } });

    // 3. Select Question by clicking on it
    await user.click(screen.getByText('Binary Tree Search'));

    // 4. Select Riddle by clicking on it
    await user.click(screen.getByText("Where's Waldo?"));

    // 5. Fill Email Data (optional - test with email disabled)
    // Toggle email off to simplify test
    const emailSwitch = screen.getByRole('switch', { name: /Enable Email Notifications/i });
    await user.click(emailSwitch);

    // 6. Submit
    const createButton = screen.getByRole('button', { name: /Create Competition/i });
    await user.click(createButton);

    // 7. Assertions
    await waitFor(() => {
      expect(CompetitionAPI.createCompetition).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    // Verify no error messages
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  test('submits with email notifications enabled', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Binary Tree Search')).toBeInTheDocument();
      expect(screen.getByText("Where's Waldo?")).toBeInTheDocument();
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Fill form
    await user.type(screen.getByLabelText(/Competition Name/i), 'Email Test Event');
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '16:00' } });

    // Select question and riddle
    await user.click(screen.getByText('Binary Tree Search'));
    await user.click(screen.getByText("Where's Waldo?"));

    // Fill email fields (email is enabled by default)
    await user.type(screen.getByLabelText(/To \(comma-separated\)/i), 'test@test.com');
    await user.type(screen.getByLabelText(/Subject/i), 'Competition Announcement');

    // Submit
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    // Verify submission
    await waitFor(() => {
      expect(CompetitionAPI.createCompetition).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Email Test Event',
          emailEnabled: true,
          emailNotification: expect.objectContaining({
            to: 'test@test.com',
            subject: 'Competition Announcement',
          }),
        })
      );
    });
  });
});