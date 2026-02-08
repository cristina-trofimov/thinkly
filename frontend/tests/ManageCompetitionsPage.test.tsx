import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useLocation, useOutlet } from 'react-router-dom';

import ManageCompetitions from '../src/views/admin/ManageCompetitionsPage';
import { getCompetitions, deleteCompetition } from '../src/api/CompetitionAPI';
import { logFrontend } from '../src/api/LoggerAPI';
import { type Competition } from '../src/types/competition/Competition.type';
import { toast } from 'sonner';

// Mock dependencies
const mockNavigate = jest.fn();
const mockLocation = { key: 'test-key', state: null, pathname: '/manage', search: '', hash: '' };
const mockOutlet = jest.fn(() => null);

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useOutlet: () => mockOutlet(),
}));

jest.mock('../src/config', () => ({
  getBackendUrl: () => 'http://localhost:5173',
}));

jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock EditCompetitionDialog
jest.mock('../src/components/manageCompetitions/EditCompetitionDialog', () => {
  return function MockEditCompetitionDialog({ open, onOpenChange, competitionId, onSuccess }: any) {
    if (!open) return null;
    return (
      <div data-testid="edit-competition-dialog">
        <div>Edit Competition {competitionId}</div>
        <button onClick={() => { onSuccess(); onOpenChange(false); }}>Save</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    );
  };
});

const mockedGetCompetitions = getCompetitions as jest.MockedFunction<typeof getCompetitions>;
const mockedDeleteCompetition = deleteCompetition as jest.MockedFunction<typeof deleteCompetition>;
const mockedLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

describe('ManageCompetitions', () => {
  const now = new Date('2024-06-15T12:00:00Z');
  
  const competitions: Competition[] = [
    {
      id: 1,
      competitionTitle: 'Math Contest',
      competitionLocation: 'Toronto',
      startDate: new Date('2024-06-20T10:00:00Z'), // Upcoming
      endDate: new Date('2024-06-20T16:00:00Z'),
    },
    {
      id: 2,
      competitionTitle: 'Science Fair',
      competitionLocation: 'Montreal',
      startDate: new Date('2024-06-15T10:00:00Z'), // Active (same day as now)
      endDate: new Date('2024-06-15T16:00:00Z'),
    },
    {
      id: 3,
      competitionTitle: 'History Quiz',
      competitionLocation: 'Vancouver',
      startDate: new Date('2024-06-10T10:00:00Z'), // Completed
      endDate: new Date('2024-06-10T16:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    mockedGetCompetitions.mockResolvedValue(competitions);
    mockOutlet.mockReturnValue(null);
    (mockLocation as any).state = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('renders the page title and description', async () => {
      render(<ManageCompetitions />);

      expect(screen.getByText('Manage Competitions')).toBeInTheDocument();
      expect(screen.getByText('View and manage all your competitions')).toBeInTheDocument();
    });

    it('renders competitions after loading', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
        expect(screen.getByText(/Science Fair/i)).toBeInTheDocument();
        expect(screen.getByText(/History Quiz/i)).toBeInTheDocument();
      });

      expect(mockedGetCompetitions).toHaveBeenCalledTimes(1);
    });

    it('renders the create new competition card', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('Create New Competition')).toBeInTheDocument();
        expect(screen.getByText('Setup a new coding event')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching competitions', () => {
      mockedGetCompetitions.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<ManageCompetitions />);

      expect(screen.getByText('Refreshing competition list...')).toBeInTheDocument();
    });

    it('renders outlet content when outlet is present', () => {
      mockOutlet.mockReturnValue(<div>Outlet Content</div>);
      render(<ManageCompetitions />);

      expect(screen.getByText('Outlet Content')).toBeInTheDocument();
      expect(screen.queryByText('Manage Competitions')).not.toBeInTheDocument();
    });
  });

  describe('Competition Status', () => {
    it('displays correct status badges for competitions', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('Math Contest')).toBeInTheDocument();
      });

      const cards = screen.getAllByText(/Upcoming|Active|Completed/);
      expect(cards.length).toBeGreaterThan(0);
    });

    it('applies correct CSS classes based on status', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('Math Contest')).toBeInTheDocument();
      });

      const upcomingBadge = screen.getByText('Upcoming');
      expect(upcomingBadge).toHaveClass('bg-blue-100', 'text-blue-700');
    });
  });

  describe('Search Functionality', () => {
    it('filters competitions by title', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const searchInput = screen.getByPlaceholderText(/Search competitions/i);
      fireEvent.change(searchInput, { target: { value: 'Science' } });

      expect(screen.getByText(/Science Fair/i)).toBeInTheDocument();
      expect(screen.queryByText(/Math Contest/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/History Quiz/i)).not.toBeInTheDocument();
    });

    it('filters competitions by location', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const searchInput = screen.getByPlaceholderText(/Search competitions/i);
      fireEvent.change(searchInput, { target: { value: 'Vancouver' } });

      expect(screen.getByText(/History Quiz/i)).toBeInTheDocument();
      expect(screen.queryByText(/Math Contest/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Science Fair/i)).not.toBeInTheDocument();
    });

    it('shows "No competitions found" when search has no results', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const searchInput = screen.getByPlaceholderText(/Search competitions/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent Competition' } });

      expect(screen.getByText('No competitions found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });

    it('is case-insensitive when searching', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const searchInput = screen.getByPlaceholderText(/Search competitions/i);
      fireEvent.change(searchInput, { target: { value: 'MATH' } });

      expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('combines search and status filter', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      // Search for "Contest"
      const searchInput = screen.getByPlaceholderText(/Search competitions/i);
      fireEvent.change(searchInput, { target: { value: 'Contest' } });

      // Filter by Upcoming
      const filterButton = screen.getByRole('button', { name: /All competitions/i });
      fireEvent.click(filterButton);
      fireEvent.click(screen.getByText('Upcoming'));

      await waitFor(() => {
        expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
        expect(screen.queryByText(/Science Fair/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/History Quiz/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to create competition page when create card is clicked', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Create New Competition/i));

      const createCard = screen.getByText(/Create New Competition/i).closest('div[class*="cursor-pointer"]');
      fireEvent.click(createCard!);

      expect(mockNavigate).toHaveBeenCalledWith("createCompetition");
    });

    it('opens edit dialog when competition card is clicked', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const mathCard = screen.getByText(/Math Contest/i).closest('div[class*="cursor-pointer"]');
      fireEvent.click(mathCard!);

      expect(screen.getByTestId('edit-competition-dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Competition 1')).toBeInTheDocument();
    });
  });

  describe('Edit Dialog', () => {
    it('closes edit dialog when cancel is clicked', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const mathCard = screen.getByText(/Math Contest/i).closest('div[class*="cursor-pointer"]');
      fireEvent.click(mathCard!);

      expect(screen.getByTestId('edit-competition-dialog')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-competition-dialog')).not.toBeInTheDocument();
      });
    });

    it('reloads competitions after successful edit', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      mockedGetCompetitions.mockClear();

      const mathCard = screen.getByText(/Math Contest/i).closest('div[class*="cursor-pointer"]');
      fireEvent.click(mathCard!);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedGetCompetitions).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('opens delete confirmation dialog when delete button is clicked', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete the competition/i)).toBeInTheDocument();
    });

    it('does not trigger card click when delete button is clicked', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Edit dialog should NOT open
      expect(screen.queryByTestId('edit-competition-dialog')).not.toBeInTheDocument();
      // Delete dialog should open
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('closes delete dialog when cancel is clicked', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
      });
    });

    it('deletes competition when confirmed', async () => {
      mockedDeleteCompetition.mockResolvedValue(undefined);
      
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      mockedGetCompetitions.mockClear();

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedDeleteCompetition).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith('Competition "Math Contest" deleted successfully');
        expect(mockedGetCompetitions).toHaveBeenCalled();
      });
    });

    it('shows error toast when delete fails', async () => {
      const error = new Error('Delete failed');
      mockedDeleteCompetition.mockRejectedValue(error);
      
      render(<ManageCompetitions />);

      await waitFor(() => screen.getByText(/Math Contest/i));

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete competition. Please try again.');
        expect(mockedLogFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'ERROR',
            message: expect.stringContaining('Delete failed'),
          })
        );
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no competitions exist', async () => {
      mockedGetCompetitions.mockResolvedValue([]);
      
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('No competitions yet')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating your first competition')).toBeInTheDocument();
      });
    });

    it('does not show loading state when there are no competitions', async () => {
      mockedGetCompetitions.mockResolvedValue([]);
      
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('No competitions yet')).toBeInTheDocument();
      });

      expect(screen.queryByText('Refreshing competition list...')).not.toBeInTheDocument();
    });
  });

  describe('Success Toast from Navigation', () => {
    it('shows success toast when navigating with success state', async () => {
      (mockLocation as any).state = { success: true };
      
      render(<ManageCompetitions />);

      expect(toast.success).toHaveBeenCalledWith('Competition published successfully!');
    });

    it('does not show toast when no success state', async () => {
      (mockLocation as any).state = null;
      
      render(<ManageCompetitions />);

      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('logs error when fetching competitions fails', async () => {
      const error = new Error('Network error');
      mockedGetCompetitions.mockRejectedValue(error);
      
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(mockedLogFrontend).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'ERROR',
            message: expect.stringContaining('Network error'),
            component: 'ManageCompetitionsPage.tsx',
          })
        );
      });
    });

    it('handles competitions with missing fields gracefully', async () => {
      const competitionsWithMissing: Competition[] = [
        {
          id: 1,
          competitionTitle: undefined as any,
          competitionLocation: undefined as any,
          startDate: new Date('2024-06-20T10:00:00Z'),
          endDate: new Date('2024-06-20T16:00:00Z'),
        },
      ];
      mockedGetCompetitions.mockResolvedValue(competitionsWithMissing);
      
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('Untitled Competition')).toBeInTheDocument();
        expect(screen.getByText('Location TBD')).toBeInTheDocument();
      });
    });

    it('handles invalid date gracefully', async () => {
      const competitionsWithInvalidDate: Competition[] = [
        {
          id: 1,
          competitionTitle: 'Test',
          competitionLocation: 'Location',
          startDate: 'invalid-date' as any,
          endDate: new Date('2024-06-20T16:00:00Z'),
        },
      ];
      mockedGetCompetitions.mockResolvedValue(competitionsWithInvalidDate);
      
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.getByText('TBD')).toBeInTheDocument();
        expect(screen.getByText('Upcoming')).toBeInTheDocument(); // Falls back to Upcoming for invalid dates
      });
    });
  });

  describe('Sorting', () => {
    it('sorts competitions by start date (newest first)', async () => {
      render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
      });

      const competitionCards = screen.getAllByText(/Contest|Fair|Quiz/);
      const titles = competitionCards.map(card => card.textContent);
      
      // Math Contest (June 20) should come before History Quiz (June 10)
      const mathIndex = titles.findIndex(t => t?.includes('Math'));
      const historyIndex = titles.findIndex(t => t?.includes('History'));
      
      expect(mathIndex).toBeLessThan(historyIndex);
    });
  });

  describe('Component Lifecycle', () => {
    it('cleans up on unmount to prevent state updates', async () => {
      const { unmount } = render(<ManageCompetitions />);

      await waitFor(() => {
        expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
      });

      // Unmount and ensure no errors
      unmount();
      
      // This test passes if no warnings about state updates on unmounted component appear
    });

    it('refetches competitions when location key changes', async () => {
      const { rerender } = render(<ManageCompetitions />);

      await waitFor(() => {
        expect(mockedGetCompetitions).toHaveBeenCalledTimes(1);
      });

      // Change location key
      (mockLocation as any).key = 'new-key';
      
      rerender(<ManageCompetitions />);

      await waitFor(() => {
        expect(mockedGetCompetitions).toHaveBeenCalledTimes(2);
      });
    });
  });
});