import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageCompetitions from  '../src/views/admin/ManageCompetitionsPage';


// --- Mocks ---

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus Icon</div>,
  Search: () => <div data-testid="search-icon">Search Icon</div>,
  Filter: () => <div data-testid="filter-icon">Filter Icon</div>,
}));


// This array will store all calls to the MockDialog to replace the functionality of jest.fn().mock.calls
const dialogCallHistory = [];

// Mock the CreateCompetitionDialog component
jest.mock('../src/components/manage-competitions/CreateCompetitionDialog', () => {
    // Define the component logic
    const DialogComponent = (props) => {
        // Log the call arguments manually
        dialogCallHistory.push(props);
        
        return (
            <div data-testid="create-competition-dialog" data-dialog-open={props.open ? 'true' : 'false'}>
                {props.open ? 'Create Competition Dialog is Open' : 'Create Competition Dialog is Closed'}
                <button onClick={() => props.onOpenChange(false)}>Close Dialog</button>
            </div>
        );
    };

    return DialogComponent;
});

// --- Test Suite ---

describe('ManageCompetitions', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    dialogCallHistory.length = 0; // Manually clear the call history
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component without crashing and the dialog is initially closed', () => {
      render(<ManageCompetitions />);
      expect(screen.getByPlaceholderText('Search competitions...')).toBeInTheDocument();
      const dialog = screen.getByTestId('create-competition-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-dialog-open', 'false');
      expect(screen.getByText('Create Competition Dialog is Closed')).toBeInTheDocument();
    });

    it('renders all competition cards', () => {
      render(<ManageCompetitions />);
      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
    });

    it('renders the Create New Competition card', () => {
      render(<ManageCompetitions />);
      expect(screen.getByText('Create New Competition')).toBeInTheDocument();
    });

    it('renders competition descriptions', () => {
      render(<ManageCompetitions />);
      const descriptions = screen.getAllByText('short one line description of comp...');
      expect(descriptions).toHaveLength(2);
    });

    it('renders View buttons for each competition', () => {
      render(<ManageCompetitions />);
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
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
      // Using 'short' to match both descriptions
      await user.type(searchInput, 'short');

      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
    });

    it('shows no results message when search matches nothing', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No competitions found matching your filters.')).toBeInTheDocument();
      expect(screen.queryByText(/Comp #1/)).not.toBeInTheDocument();
    });

    it('is case-insensitive', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'comp #1');

      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('opens filter dropdown when clicked and displays current filter', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      // Initial filter text
      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      expect(within(filterButton).getByText('All competitions')).toBeInTheDocument();
      await user.click(filterButton);

      expect(screen.getByText('Filter by Status')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'All' })).toBeInTheDocument();

      // Check for status options
      const activeOption = screen.getByRole('menuitem', { name: 'Active' });
      await user.click(activeOption);
      
      // Check filter button text has updated
      expect(within(filterButton).getByText('Active')).toBeInTheDocument();
    });

    it('filters competitions by Active status', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);

      const activeOption = screen.getByRole('menuitem', { name: 'Active' });
      await user.click(activeOption);

      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.queryByText(/Comp #2 - 12\/10\/25/)).not.toBeInTheDocument();
    });

    it('filters competitions by Upcoming status', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);

      const upcomingOption = screen.getByRole('menuitem', { name: 'Upcoming' });
      await user.click(upcomingOption);

      expect(screen.queryByText(/Comp #1 - 12\/10\/25/)).not.toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
    });

    it('shows no results when filtering by Completed status', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);

      const completedOption = screen.getByRole('menuitem', { name: 'Completed' });
      await user.click(completedOption);

      expect(screen.getByText('No competitions found matching your filters.')).toBeInTheDocument();
    });

    it('resets filter when selecting All', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      // First apply a filter
      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);
      await user.click(screen.getByRole('menuitem', { name: 'Active' }));

      // Then reset it
      await user.click(filterButton);
      await user.click(screen.getByRole('menuitem', { name: 'All' }));

      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
      expect(within(filterButton).getByText('All competitions')).toBeInTheDocument();
    });
  });

  describe('Combined Search and Filter', () => {
    it('applies both search and status filter together', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      // Apply search
      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'Comp');

      // Apply filter
      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);
      await user.click(screen.getByRole('menuitem', { name: 'Upcoming' })); // Change to upcoming for Comp #2

      // Should only show Comp #2 (matches search and Upcoming status)
      expect(screen.queryByText(/Comp #1 - 12\/10\/25/)).not.toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    // ... (handleView test remains the same) ...

    it('opens the CreateCompetitionDialog when Create New Competition card is clicked', async () => {
        const user = userEvent.setup();
        render(<ManageCompetitions />);

        // 1. Initial state check (0 calls)
        expect(dialogCallHistory).toHaveLength(1); // Mount call
        expect(dialogCallHistory[0].open).toBe(false);

        const createCard = screen.getByText('Create New Competition').closest('div').parentElement;
        await user.click(createCard);

        // 2. Open state check (1 call on mount, 1 call after click)
        await waitFor(() => {
            // Check that the last call to the mock component had 'open: true'
            expect(dialogCallHistory).toHaveLength(2);
            expect(dialogCallHistory[1].open).toBe(true);
            expect(screen.getByText('Create Competition Dialog is Open')).toBeInTheDocument();
        });

        // 3. Verify the dialog can be closed
        await user.click(screen.getByRole('button', { name: /close dialog/i }));

        // 4. Closed state check
        await waitFor(() => {
            // Check that the last call to the mock component had 'open: false'
            expect(dialogCallHistory).toHaveLength(3);
            expect(dialogCallHistory[2].open).toBe(false);
            expect(screen.getByText('Create Competition Dialog is Closed')).toBeInTheDocument();
        });
    });
  });

  describe('UI Elements', () => {
    it('displays search icon', () => {
      render(<ManageCompetitions />);
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('displays filter icon', () => {
      render(<ManageCompetitions />);
      expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
    });

    it('displays plus icon in Create New Competition card', () => {
      render(<ManageCompetitions />);
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty search query', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      const searchInput = screen.getByPlaceholderText('Search competitions...');
      await user.type(searchInput, 'test');
      await user.clear(searchInput);

      // Should show all competitions when search is cleared
      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.getByText(/Comp #2 - 12\/10\/25/)).toBeInTheDocument();
    });

    it('Create New Competition card is always visible regardless of filters', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);

      // Apply a filter that shows no results
      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);
      await user.click(screen.getByRole('menuitem', { name: 'Completed' }));

      // Create button should still be visible
      expect(screen.getByText('Create New Competition')).toBeInTheDocument();
    });
  });
});