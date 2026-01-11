import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ManageRiddles from '../src/views/admin/ManageRiddlePage';
import { getRiddles } from '../src/api/RiddlesAPI';
import { toast } from 'sonner';

// --- MOCKS ---

// 1. Mock API
jest.mock('@/api/RiddlesAPI', () => ({
  getRiddles: jest.fn(),
}));

// 2. Mock Toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// 3. Mock Child Component (Create Form)
// We mock this to easily trigger the onSuccess callback without filling out a real form
jest.mock('@/components/forms/FileUpload', () => ({
  __esModule: true,
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="mock-create-form">
      <button data-testid="trigger-form-success" onClick={onSuccess}>
        Simulate Success
      </button>
    </div>
  ),
}));

// 4. Mock UI Components
// This prevents issues with Radix UI/Shadcn in the Jest environment
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: any) => <div className={className} onClick={onClick}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div data-open={open}>{children}</div>,
  DialogTrigger: ({ children, onClick }: any) => <div onClick={onClick} data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

// 5. Mock Icons
jest.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Search: () => <span>SearchIcon</span>,
  FileText: () => <span>FileText</span>,
  Image: () => <span>ImageIcon</span>,
  HelpCircle: () => <span>?</span>,
}));

describe('ManageRiddles', () => {
  // Helper to cast the mock function for TypeScript
  const mockGetRiddles = getRiddles as jest.Mock;

  const mockRiddleData = [
    { id: 1, question: 'What has keys but no locks?', answer: 'A piano', file: null },
    { id: 2, question: 'What has legs but cannot walk?', answer: 'A chair', file: 'http://example.com/image.png' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders without crashing', async () => {
      mockGetRiddles.mockResolvedValue([]);
      
      render(<ManageRiddles />);

      expect(screen.getByText('Manage Riddles')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search question or answer...')).toBeInTheDocument();
      
      // Ensure loading state resolves
      await waitFor(() => {
        expect(screen.queryByText('Loading riddles...')).not.toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      // Return a promise that doesn't resolve immediately
      mockGetRiddles.mockImplementation(() => new Promise(() => {}));
      
      render(<ManageRiddles />);
      
      expect(screen.getByText('Loading riddles...')).toBeInTheDocument();
    });


  });

  describe('Data Fetching', () => {
    it('fetches riddles on mount', async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);
      
      render(<ManageRiddles />);

      await waitFor(() => {
        expect(mockGetRiddles).toHaveBeenCalledTimes(1);
      });
    });

    it('displays fetched riddles', async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);
      
      render(<ManageRiddles />);

      await waitFor(() => {
        expect(screen.getByText('What has keys but no locks?')).toBeInTheDocument();
        expect(screen.getByText('A piano')).toBeInTheDocument();
        expect(screen.getByText('What has legs but cannot walk?')).toBeInTheDocument();
      });
    });

    it('renders attachment badge and button only when file exists', async () => {
        mockGetRiddles.mockResolvedValue(mockRiddleData);
        
        render(<ManageRiddles />);
  
        await waitFor(() => {
          // Riddle 1 (No file)
          expect(screen.queryAllByText('Has Media').length).toBe(1); // Only for riddle 2
          expect(screen.queryAllByText('View Attachment').length).toBe(1); // Only for riddle 2
        });
      });
  });

  describe('Search Functionality', () => {
    it('filters riddles based on search query (Question)', async () => {
      mockGetRiddles.mockResolvedValue(mockRiddleData);
      render(<ManageRiddles />);

      await waitFor(() => expect(screen.getByText('A piano')).toBeInTheDocument());

      const input = screen.getByPlaceholderText('Search question or answer...');
      
      // Search for "piano" (Question 1 answer)
      fireEvent.change(input, { target: { value: 'piano' } });

      expect(screen.getByText('What has keys but no locks?')).toBeInTheDocument();
      expect(screen.queryByText('What has legs but cannot walk?')).not.toBeInTheDocument();
    });

    it('filters riddles based on search query (Answer)', async () => {
        mockGetRiddles.mockResolvedValue(mockRiddleData);
        render(<ManageRiddles />);
  
        await waitFor(() => expect(screen.getByText('A piano')).toBeInTheDocument());
  
        const input = screen.getByPlaceholderText('Search question or answer...');
        
        // Search for "chair" (Question 2 answer)
        fireEvent.change(input, { target: { value: 'chair' } });
  
        expect(screen.getByText('What has legs but cannot walk?')).toBeInTheDocument();
        expect(screen.queryByText('What has keys but no locks?')).not.toBeInTheDocument();
    });

    it('shows empty state behavior when search yields no results', async () => {
        mockGetRiddles.mockResolvedValue(mockRiddleData);
        render(<ManageRiddles />);
  
        await waitFor(() => expect(screen.getByText('A piano')).toBeInTheDocument());
  
        const input = screen.getByPlaceholderText('Search question or answer...');
        fireEvent.change(input, { target: { value: 'XYZ_NON_EXISTENT' } });
  
        // Both should disappear
        expect(screen.queryByText('What has keys but no locks?')).not.toBeInTheDocument();
        expect(screen.queryByText('What has legs but cannot walk?')).not.toBeInTheDocument();
    });
  });

  
  describe('Error Handling', () => {
    it('displays error toast on fetch failure', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGetRiddles.mockRejectedValue(new Error('Network Error'));
        
        render(<ManageRiddles />);
        
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load riddles');
        });

        consoleSpy.mockRestore();
    });

    it('stops loading state even after error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGetRiddles.mockRejectedValue(new Error('Network Error'));
        
        render(<ManageRiddles />);
        
        await waitFor(() => {
            expect(screen.queryByText('Loading riddles...')).not.toBeInTheDocument();
        });
        
        consoleSpy.mockRestore();
    });
  });
});