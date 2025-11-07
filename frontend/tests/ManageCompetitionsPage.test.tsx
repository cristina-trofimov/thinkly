import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageCompetitions from '../src/components/manage-competitions/ManageCompetitionsPage';

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus Icon</div>,
  Search: () => <div data-testid="search-icon">Search Icon</div>,
  Filter: () => <div data-testid="filter-icon">Filter Icon</div>,
}));

describe('ManageCompetitions', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component without crashing', () => {
      render(<ManageCompetitions />);
      expect(screen.getByPlaceholderText('Search competitions...')).toBeInTheDocument();
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
      await user.type(searchInput, 'description');

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
    it('opens filter dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<ManageCompetitions />);
      
      const filterButton = screen.getByRole('button', { name: /all competitions/i });
      await user.click(filterButton);

      expect(screen.getByText('Filter by Status')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Upcoming' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Completed' })).toBeInTheDocument();
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
      await user.click(screen.getByRole('menuitem', { name: 'Active' }));

      // Should only show Comp #1 (matches search and Active status)
      expect(screen.getByText(/Comp #1 - 12\/10\/25/)).toBeInTheDocument();
      expect(screen.queryByText(/Comp #2 - 12\/10\/25/)).not.toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('calls handleView with correct id when View button is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      render(<ManageCompetitions />);
      
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      fireEvent.click(viewButtons[0]);

      expect(consoleSpy).toHaveBeenCalledWith('View competition:', '1');
      consoleSpy.mockRestore();
    });

    it('calls handleCreateNew when Create New Competition card is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      render(<ManageCompetitions />);
      
      const createCard = screen.getByText('Create New Competition').closest('div').parentElement;
      fireEvent.click(createCard);

      expect(consoleSpy).toHaveBeenCalledWith('Create new competition');
      consoleSpy.mockRestore();
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