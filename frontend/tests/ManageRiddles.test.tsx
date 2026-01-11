import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageRiddles from '../src/views/admin/ManageRiddlePage'; // Adjust path
import { getRiddles } from '../src/api/RiddlesAPI';
import { toast } from 'sonner';

// --- MOCK SETUP ---

// 1. Mock API and Toast
vi.mock('@/services/riddle.service', () => ({
    getRiddles: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

// 2. Mock UI Components (to isolate logic)
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className, onClick }: any) => (
        <div data-testid="mock-card" className={className} onClick={onClick}>
            {children}
        </div>
    ),
    CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, variant }: any) => (
        <button data-testid={`btn-${variant || 'default'}`} onClick={onClick}>
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder }: any) => (
        <input
            data-testid="search-input"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    ),
}));

// 3. Mock Dialog (Complex UI)
// We simply render the trigger and the content always, or control it via simple state in the mock if needed.
// For unit tests, it's often easier to render the content directly if "open" is true, 
// but since Radix UI (shadcn) dialogs are complex, we often just mock them as divs.
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open, onOpenChange }: any) => (
        <div data-testid="mock-dialog" data-open={open}>
            {children}
        </div>
    ),
    DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }: any) => <h3>{children}</h3>,
}));

// 4. Mock the Create Form (Child Component)
// We mock this to avoid testing the form logic again. We just check if it receives the onSuccess prop.
vi.mock('@/components/forms/CreateRiddleForm', () => ({
    default: ({ onSuccess }: any) => (
        <div data-testid="create-riddle-form">
            Mock Create Form
            <button data-testid="trigger-success" onClick={onSuccess}>
                Trigger Success
            </button>
        </div>
    ),
}));

// 5. Mock Icons
vi.mock('lucide-react', () => ({
    Plus: () => <span>+</span>,
    Search: () => <span>SearchIcon</span>,
    FileText: () => <span>FileText</span>,
    Image: () => <span>ImageIcon</span>,
    HelpCircle: () => <span>?</span>,
}));

describe('ManageRiddles', () => {
    const mockRiddles = [
        { id: 1, question: 'Question One', answer: 'Answer One', file: null },
        { id: 2, question: 'Question Two', answer: 'Answer Two', file: 'http://img.png' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the page title and search bar', async () => {
        (getRiddles as any).mockResolvedValue([]);
        render(<ManageRiddles />);

        expect(screen.getByText('Manage Riddles')).toBeInTheDocument();
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search question or answer/i)).toBeInTheDocument();
    });

    it('fetches and displays riddles on mount', async () => {
        (getRiddles as any).mockResolvedValue(mockRiddles);
        render(<ManageRiddles />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.getByText('Question One')).toBeInTheDocument();
            expect(screen.getByText('Question Two')).toBeInTheDocument();
        });

        // Check for Answer text (it's in the document)
        expect(screen.getByText('Answer One')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
        // Return a promise that never resolves immediately to keep loading state active
        (getRiddles as any).mockReturnValue(new Promise(() => { }));
        render(<ManageRiddles />);

        expect(screen.getByText(/Loading riddles.../i)).toBeInTheDocument();
    });

    it('filters riddles based on search input', async () => {
        (getRiddles as any).mockResolvedValue(mockRiddles);
        render(<ManageRiddles />);

        await waitFor(() => expect(screen.getByText('Question One')).toBeInTheDocument());

        const input = screen.getByTestId('search-input');

        // Type "Two"
        fireEvent.change(input, { target: { value: 'Two' } });

        // "Question One" should disappear, "Question Two" should remain
        expect(screen.queryByText('Question One')).not.toBeInTheDocument();
        expect(screen.getByText('Question Two')).toBeInTheDocument();
    });

    it('displays attachment indicator if file exists', async () => {
        (getRiddles as any).mockResolvedValue(mockRiddles);
        render(<ManageRiddles />);

        await waitFor(() => {
            // Riddle 1 has no file
            // Riddle 2 has file
            const badges = screen.getAllByText(/Has Media/i);
            expect(badges.length).toBe(1); // Only one badge should be rendered
        });
    });

    it('opens create dialog and refreshes list on success', async () => {
        (getRiddles as any).mockResolvedValue([]);
        render(<ManageRiddles />);

        // Check Dialog Trigger exists (The "Create New Riddle" card)
        expect(screen.getByText('Create New Riddle')).toBeInTheDocument();

        // Since we mocked Dialog to always render content (or just simple divs), 
        // we can check if the form mock is present. 
        // In a real Dialog mock, you might need to click the trigger first.
        // Based on our mock above: <div data-testid="dialog-content">{children}</div>
        // The content is rendered in the DOM structure even if "closed" in some naive mocks, 
        // OR we can assume Radix structure. 

        // Let's verify the form mock is there
        const formMock = screen.getByTestId('create-riddle-form');
        expect(formMock).toBeInTheDocument();

        // Simulate "Success" from the form (which should trigger reload)
        const successBtn = screen.getByTestId('trigger-success');

        // Clear the initial getRiddles call
        (getRiddles as any).mockClear();

        fireEvent.click(successBtn);

        // Verify getRiddles was called again to refresh the list
        await waitFor(() => {
            expect(getRiddles).toHaveBeenCalledTimes(1);
        });
    });

    it('handles API errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (getRiddles as any).mockRejectedValue(new Error('Fetch failed'));

        render(<ManageRiddles />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load riddles');
        });

        consoleSpy.mockRestore();
    });
});