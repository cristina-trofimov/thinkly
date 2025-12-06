import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCompetitionDialog from '../src/components/manageCompetitions/CreateCompetitionDialog';
import { getQuestions } from '../src/api/QuestionsAPI';
import { sendEmail } from '../src/api/EmailAPI';

// --- Mocks ---

// Mock the API modules
jest.mock('@/api/QuestionsAPI', () => ({
  getQuestions: jest.fn(),
}));

jest.mock('@/api/EmailAPI', () => ({
  sendEmail: jest.fn(),
}));

// Mock the UI components if they cause issues in JSDOM, 
// though usually Shadcn/Radix components work fine. 
// We will mock the icons to keep the DOM clean.
jest.mock('@tabler/icons-react', () => ({
  IconPlus: () => <span data-testid="icon-plus" />,
  IconSearch: () => <span data-testid="icon-search" />,
}));

// Mock Data
const mockQuestions = [
  { id: '101', title: 'Binary Tree Search', difficulty: 'Medium' },
  { id: '102', title: 'Graph Traversal', difficulty: 'Hard' },
  { id: '103', title: 'Array Sorting', difficulty: 'Easy' },
];

describe('CreateCompetitionDialog', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getQuestions as jest.Mock).mockResolvedValue(mockQuestions);
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

    // Check if API was called to load questions
    expect(getQuestions).toHaveBeenCalledTimes(1);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText('Binary Tree Search')).toBeInTheDocument();
    });
  });

  test('filters questions based on search query', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Binary Tree Search')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search questions...');
    const user = userEvent.setup();

    // Type "Graph"
    await user.type(searchInput, 'Graph');

    // "Graph Traversal" should exist, "Binary Tree" should be gone
    expect(screen.getByText('Graph Traversal')).toBeInTheDocument();
    expect(screen.queryByText('Binary Tree Search')).not.toBeInTheDocument();
  });

  test('validates form: shows error for missing fields', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Click submit without filling anything
    const submitBtn = screen.getByRole('button', { name: /Create Competition/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Incomplete general information/i)).toBeInTheDocument();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  test('validates form: shows error for past dates', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Fill basic info
    await user.type(screen.getByLabelText(/Competition Name/i), 'Past Event');

    // Set a date in the past (e.g., year 2000)
    await user.type(screen.getByLabelText(/Date/i), '2000-01-01');
    await user.type(screen.getByLabelText(/Start Time/i), '10:00');
    await user.type(screen.getByLabelText(/End Time/i), '12:00');

    const submitBtn = screen.getByRole('button', { name: /Create Competition/i });
    await user.click(submitBtn);

    expect(screen.getByText(/must be scheduled for a future date/i)).toBeInTheDocument();
  });

  test('validates form: shows error when no question/riddle selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Helper to get a future date string YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Fill General Info
    await user.type(screen.getByLabelText(/Competition Name/i), 'Valid Event');
    await user.type(screen.getByLabelText(/Date/i), dateStr);
    await user.type(screen.getByLabelText(/Start Time/i), '10:00');
    await user.type(screen.getByLabelText(/End Time/i), '12:00');

    // Attempt submit (No questions/riddles selected)
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    // Should complain about questions first
    expect(screen.getByText(/Please select at least one question/i)).toBeInTheDocument();

    // Select a question
    await waitFor(() => screen.getByText('Binary Tree Search'));
    // Finding checkboxes can be tricky in Shadcn, often easiest to click the label or container row
    // We'll target the checkbox directly if accessible, or the row text
    const questionCheckbox = screen.getAllByRole('checkbox')[0]; // Assuming first checkbox is for the first question
    await user.click(questionCheckbox);

    // Attempt submit again
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));
    expect(screen.getByText(/Please select at least one riddle/i)).toBeInTheDocument();
  });

  test('submits successfully with valid data and calls email API', async () => {
    const user = userEvent.setup();
    renderComponent();

    // 1. Setup Data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // 2. Fill Form
    await user.type(screen.getByLabelText(/Competition Name/i), 'Grand Prix');
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '16:00' } });

    // 3. Select Question (Mocked data needs to load first)
    await waitFor(() => expect(screen.getByText('Binary Tree Search')).toBeInTheDocument());

    // Click first question checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // 4. Select Riddle (Riddles are hardcoded, assume they render after questions)
    // We can search for a riddle title to find the specific checkbox
    const riddleTitle = screen.getByText("Where's Waldo?");
    const riddleRow = riddleTitle.closest('div')?.parentElement; // Adjust based on DOM structure
    // Or just click the checkbox associated with the riddle. 
    // Since riddles are rendered after questions, we'll look for the riddle text
    await user.click(screen.getByText("Where's Waldo?")); // Clicking text usually doesn't toggle checkbox unless wrapped in label, but let's try strict checkbox selection:

    // Better strategy for selection:
    // Find the riddle container and click the checkbox inside it
    // Note: In your code, `filteredRiddles` map creates checkboxes.
    // Let's assume the riddle checkboxes appear later in the DOM order.
    const riddleCheckbox = checkboxes[checkboxes.length - 6]; // 6 hardcoded riddles
    await user.click(riddleCheckbox);

    // 5. Fill Email Data
    await user.type(screen.getByLabelText(/To \(comma-separated\)/i), 'test@test.com');
    await user.type(screen.getByLabelText(/Subject/i), 'Hello');

    // 6. Submit
    const createButton = screen.getByRole('button', { name: /Create Competition/i });
    await user.click(createButton);

    // 7. Assertions
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument(); // No error messages

    // Check Email API
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'test@test.com',
      subject: 'Hello',
    }));

    // Check Dialog Closure
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('submits without email if email fields are empty', async () => {
    const user = userEvent.setup();
    renderComponent();

    // 1. Setup Valid Data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await user.type(screen.getByLabelText(/Competition Name/i), 'No Email Event');
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '16:00' } });

    // Select items
    await waitFor(() => screen.getByText('Binary Tree Search'));
    const allCheckboxes = screen.getAllByRole('checkbox');
    await user.click(allCheckboxes[0]); // Select first question
    await user.click(allCheckboxes[allCheckboxes.length - 1]); // Select last riddle

    // 2. Submit
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    // 3. Assertions
    expect(sendEmail).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});