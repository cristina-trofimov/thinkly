import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageCompetitions from '../src/views/admin/ManageCompetitionsPage' // Adjust path as needed based on your file structure

// --- Mocks ---

// 1. Mock Lucide Icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus Icon</div>,
  Search: () => <div data-testid="search-icon">Search Icon</div>,
  Filter: () => <div data-testid="filter-icon">Filter Icon</div>,
}));

// 2. Mock the CHILD component (CreateCompetitionDialog)
// IMPORTANT: The path in jest.mock must match the import path used in your component file
// or be relative to this test file pointing to the actual child component.
jest.mock('../src/components/manageCompetitions/CreateCompetitionDialog', () => {
  return function DummyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
      <div
        data-testid="create-competition-dialog"
        data-dialog-open={open ? 'true' : 'false'}
      >
        {open ? 'Create Competition Dialog is Open' : 'Create Competition Dialog is Closed'}
        {/* Simulate closing the dialog */}
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    );
  };
});

// --- Test Suite ---

describe('ManageCompetitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component without crashing and the dialog is initially closed', () => {
      render(<ManageCompetitions />);

      // Check for main UI elements
      expect(screen.getByPlaceholderText('Search competitions...')).toBeInTheDocument();

      // Check if Child Mock is present
      const dialog = screen.getByTestId('create-competition-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-dialog-open', 'false');
    });

    it('renders all competition cards', () => {
      render(<ManageCompetitions />);
      // Use regex or exact string matching
      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
    });

    it('renders the Create New Competition card', () => {
      render(<ManageCompetitions />);
      expect(screen.getByText('Create New Competition')).toBeInTheDocument();
    });

    it('renders competition descriptions', () => {
      render(<ManageCompetitions />);
      // There are two cards with this description
      const descriptions = screen.getAllByText('short one line description of comp...');
      expect(descriptions).toHaveLength(2);
    });

    it('renders View buttons for each competition', () => {
      render(<ManageCompetitions />);
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      // 2 competition cards = 2 view buttons. 
      // Note: The "Filter" button is also a button, but it doesn't have text "View"
      expect(viewButtons).toHaveLength(2);
    });
  });

  describe('Search Functionality', () => {
    it('filters competitions by name', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'Comp #1');

      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.queryByText(/Comp #2 - 12\/10\/25/)).not.toBeInTheDocument();
    });

    it('filters competitions by description', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'short');

      expect(screen.getByText(/Comp #1/)).toBeInTheDocument();
      expect(screen.getByText(/Comp #2/)).toBeInTheDocument();
    });

    it('shows no results message when search matches nothing', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No competitions found matching your filters.')).toBeInTheDocument();
      expect(screen.queryByText(/Comp #1/)).not.toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('opens filter dropdown when clicked and displays current filter', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      // Find the trigger button
      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      expect(within(filterButton).getByText('All competitions')).toBeInTheDocument();

      // Open dropdown
      await user.click(filterButton);

      // Check content
      expect(screen.getByText('Filter by Status')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Active' })).toBeInTheDocument();

      // Select Active
      await user.click(screen.getByRole('menuitem', { name: 'Active' }));

      // Verify button text updated
      expect(within(filterButton).getByText('Active')).toBeInTheDocument();
    });

    it('filters competitions by Active status', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);

      const activeOption = screen.getByRole('menuitem', { name: 'Active' });
      await user.click(activeOption);

      expect(screen.getByText(/Comp #1/)).toBeInTheDocument(); // Comp 1 is Active
      expect(screen.queryByText(/Comp #2/)).not.toBeInTheDocument(); // Comp 2 is Upcoming
    });

    it('filters competitions by Upcoming status', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);

      const upcomingOption = screen.getByRole('menuitem', { name: 'Upcoming' });
      await user.click(upcomingOption);

      expect(screen.queryByText(/Comp #1/)).not.toBeInTheDocument();
      expect(screen.getByText(/Comp #2/)).toBeInTheDocument();
    });
  });

});