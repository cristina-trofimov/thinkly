import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageAlgotimeSessionsPage from '../src/views/admin/ManageAlgotimeSessionsPage';
import { getAllAlgotimeSessions } from '../src/api/AlgotimeAPI';
import { toast } from 'sonner';
import { logFrontend } from '../src/api/LoggerAPI';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useOutlet: () => null,
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock logFrontend
jest.mock('@/api/LoggerAPI', () => ({
  logFrontend: jest.fn(),
}));

// Mock the API calls
jest.mock('@/api/AlgotimeAPI', () => ({
  getAllAlgotimeSessions: jest.fn(),
}));

const mockSessions = [
  {
    id: 1,
    eventName: 'Winter AlgoTime 2025',
    startTime: new Date('2025-12-28T20:00:00'),
    endTime: new Date('2025-12-28T21:00:00'),
    seriesId: 1,
    seriesName: 'Winter Series',
  },
  {
    id: 2,
    eventName: 'Spring AlgoTime 2025',
    startTime: new Date('2025-03-15T18:00:00'),
    endTime: new Date('2025-03-15T19:00:00'),
    seriesId: 2,
    seriesName: 'Spring Series',
  },
];

describe('ManageAlgotimeSessionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAllAlgotimeSessions as jest.Mock).mockResolvedValue(mockSessions);
  });

  test('renders page title and description', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Algotime Sessions')).toBeInTheDocument();
      expect(screen.getByText('Create and view all algotime sessions.')).toBeInTheDocument();
    });
  });

  test('renders search input', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search algotime session name')).toBeInTheDocument();
    });
  });

  test('renders create new session card', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Create a new algotime session')).toBeInTheDocument();
      expect(screen.getByText('Setup a new event!')).toBeInTheDocument();
    });
  });

  test('loads and displays algotime sessions', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(getAllAlgotimeSessions).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
      expect(screen.getByText('Spring AlgoTime 2025')).toBeInTheDocument();
    });
  });

  test('shows loading state while fetching sessions', async () => {
    (getAllAlgotimeSessions as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockSessions), 100))
    );

    render(<ManageAlgotimeSessionsPage />);

    expect(screen.getByText('Loading algotime sessions...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading algotime sessions...')).not.toBeInTheDocument();
    });
  });

  test('filters sessions based on search query', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search algotime session name');
    fireEvent.change(searchInput, { target: { value: 'winter' } });

    expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
    expect(screen.queryByText('Spring AlgoTime 2025')).not.toBeInTheDocument();
  });

  test('search is case insensitive', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search algotime session name');
    fireEvent.change(searchInput, { target: { value: 'WINTER' } });

    expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
  });

  test('shows error toast when API call fails', async () => {
    const errorMessage = 'Network error';
    (getAllAlgotimeSessions as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load algotime sessions');
      expect(logFrontend).toHaveBeenCalledWith({
        level: 'ERROR',
        message: `Failed to load algotime sessions: ${errorMessage}`,
        component: 'ManageAlgotimeSessionsPage.tsx',
        url: window.location.href,
      });
    });
  });

  test('navigates to create page when create card is clicked', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Create a new algotime session')).toBeInTheDocument();
    });

    const createCard = screen.getByText('Create a new algotime session').closest('div')?.parentElement;
    if (createCard) {
      fireEvent.click(createCard);
    }

    expect(mockNavigate).toHaveBeenCalledWith('algoTimeSessionsManagement');
  });

  test('displays no sessions when filtered search returns empty', async () => {
    render(<ManageAlgotimeSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search algotime session name');
    fireEvent.change(searchInput, { target: { value: 'nonexistent session' } });

    expect(screen.queryByText('Winter AlgoTime 2025')).not.toBeInTheDocument();
    expect(screen.queryByText('Spring AlgoTime 2025')).not.toBeInTheDocument();
  });

});