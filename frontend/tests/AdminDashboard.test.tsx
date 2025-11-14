import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminDashboard } from '../src/components/dashboard/AdminDashboard';

// --- MOCK SETUP ---

// Mocking react-router-dom hooks and components
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  // Mock Outlet to display identifiable content
  Outlet: () => <div data-testid="mock-outlet">Mock Outlet Content</div>,
}));

// Mocking child components to isolate AdminDashboard logic
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));
jest.mock('@tabler/icons-react', () => ({
  IconCirclePlusFilled: () => <svg data-testid="mock-icon-plus" />,
}));
jest.mock('../src/components/dashboard/StatsCard', () => ({
  StatsCard: ({ title, value }) => <div data-testid="mock-stat-card">{title}: {value}</div>,
}));
jest.mock('../src/components/dashboard/ManageCard', () => ({
  ManageCard: ({ title }) => <div data-testid="mock-manage-card">{title}</div>,
}));
jest.mock('../src/components/dashboard/TechnicalIssuesChart', () => ({
  TechnicalIssuesChart: () => <div data-testid="mock-chart">Mock Technical Issues Chart</div>,
}));
jest.mock('../src/components/dashboard/CreateCompetitionDialog', () => ({
  __esModule: true,
  default: ({ open, onOpenChange }) => (
    <div data-testid="mock-dialog" className={open ? 'dialog-open' : 'dialog-closed'}>
      {open ? 'Dialog is Open' : 'Dialog is Closed'}
      {/* Simulate closing the dialog for test cleanup */}
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ),
}));

describe('AdminDashboard', () => {
  // Helper to set the pathname using history.pushState
  const setPathname = (pathname: string) => {
    window.history.pushState({}, '', pathname);
  };

  beforeEach(() => {
    // Default the pathname to the dashboard root for most tests
    setPathname('/app/dashboard');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header title and the "Create Competition" button', () => {
    render(<AdminDashboard />);

    // Check for header title
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument();

    // Check for the create button text and its associated icon
    expect(screen.getByText('Create Competition')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon-plus')).toBeInTheDocument();
  });

  it('opens the CreateCompetitionDialog when the button is clicked', async () => {
    render(<AdminDashboard />);

    const createButton = screen.getByText('Create Competition');

    // 1. Initial state: Dialog should be closed
    expect(screen.getByTestId('mock-dialog')).toHaveTextContent('Dialog is Closed');
    expect(screen.getByTestId('mock-dialog')).toHaveClass('dialog-closed');

    // 2. Click the button to open the dialog
    fireEvent.click(createButton);

    // 3. Post-click state: Dialog should be open (wait for state update)
    await waitFor(() => {
      expect(screen.getByTestId('mock-dialog')).toHaveTextContent('Dialog is Open');
      expect(screen.getByTestId('mock-dialog')).toHaveClass('dialog-open');
    });
  });

  it('renders stats, manage cards, and the chart on the dashboard root route', () => {
    render(<AdminDashboard />);

    // Check for key components rendered only on the dashboard root
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();

    // Check for specific Stats Card titles
    expect(screen.getByText(/New Accounts: 25/i)).toBeInTheDocument();
    expect(screen.getByText(/User satisfaction: 4.5/i)).toBeInTheDocument();

    // Check for specific Manage Card titles
    expect(screen.getByText('Manage Accounts')).toBeInTheDocument();
    expect(screen.getByText('Manage Competitions')).toBeInTheDocument();

    // Ensure Outlet is not rendered
    expect(screen.queryByTestId('mock-outlet')).not.toBeInTheDocument();
  });

  it('renders the Outlet component on a sub-route', () => {
    // Mock the pathname to simulate a nested route
    setPathname('/app/dashboard/competitions');
    
    render(<AdminDashboard />);

    // Check for Outlet content
    expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();

    // Ensure dashboard specific content is NOT rendered (e.g., stats and chart)
    expect(screen.queryByText(/New Accounts/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });

  it('navigates to the competitions route when the "Manage Competitions" card is clicked', () => {
    render(<AdminDashboard />);

    // Find the Manage Competitions card by its title text
    const manageCompetitionsCard = screen.getByText('Manage Competitions').closest('.cursor-pointer');

    // Click the card
    fireEvent.click(manageCompetitionsCard!);

    // Verify that the navigate function was called with the correct path
    expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard/competitions');
  });
});