import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from '../src/components/dashboard/AdminDashboard';

// --- MOCK SETUP ---

// Mocking react-router-dom Outlet component
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
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

  // Helper to render component with Router wrapper
  const renderWithRouter = () => {
    return render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Default the pathname to the dashboard root for most tests
    setPathname('/app/dashboard');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header title', () => {
    renderWithRouter();

    // Check for header title
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument();
  });

  it('renders stats, manage cards, and the chart on the dashboard root route', () => {
    renderWithRouter();

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
    
    renderWithRouter();

    // Check for Outlet content
    expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();

    // Ensure dashboard specific content is NOT rendered (e.g., stats and chart)
    expect(screen.queryByText(/New Accounts/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });

  it('renders link to manage accounts with correct href', () => {
    renderWithRouter();

    // Find the link by looking for the ManageCard title within a link
    const manageAccountsLink = screen.getByText('Manage Accounts').closest('a');

    // Verify the link exists and has the correct href
    expect(manageAccountsLink).toBeInTheDocument();
    expect(manageAccountsLink).toHaveAttribute('href', '/app/dashboard/manageAccounts');
  });

  it('renders link to manage competitions with correct href', () => {
    renderWithRouter();

    // Find the link by looking for the ManageCard title within a link
    const manageCompetitionsLink = screen.getByText('Manage Competitions').closest('a');

    // Verify the link exists and has the correct href
    expect(manageCompetitionsLink).toBeInTheDocument();
    expect(manageCompetitionsLink).toHaveAttribute('href', '/app/dashboard/competitions');
  });

  it('manage questions card is not a link', () => {
    renderWithRouter();

    // Find the Manage Questions card
    const manageQuestionsCard = screen.getByText('Manage Questions');

    // Verify it's not inside a link
    const closestLink = manageQuestionsCard.closest('a');
    expect(closestLink).not.toBeInTheDocument();
  });
});