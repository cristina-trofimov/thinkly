import { render, screen, fireEvent } from '@testing-library/react';
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
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@tabler/icons-react', () => ({
  IconCirclePlusFilled: () => <svg data-testid="mock-icon-plus" />,
  IconChevronRight: () => <svg data-testid="mock-icon-chevron" />,
}));

jest.mock('../src/components/dashboard/StatsCard', () => ({
  StatsCard: ({ title, value, children }: any) => (
    <div data-testid="mock-stat-card">
      {title}
      {value && `: ${value}`}
      {children && <div data-testid="chart-child">{children}</div>}
    </div>
  ),
}));

jest.mock('../src/components/dashboard/ManageCard', () => ({
  ManageCard: ({ title }: any) => <div data-testid="mock-manage-card">{title}</div>,
}));

jest.mock('../src/components/dashboard/DashboardCharts', () => ({
  QuestionsSolvedChart: ({ timeRange }: any) => (
    <div data-testid="questions-solved-chart">Questions Chart ({timeRange})</div>
  ),
  TimeToSolveChart: ({ timeRange }: any) => (
    <div data-testid="time-to-solve-chart">Time Chart ({timeRange})</div>
  ),
  NumberOfLoginsChart: ({ timeRange }: any) => (
    <div data-testid="logins-chart">Logins Chart ({timeRange})</div>
  ),
  ParticipationOverTimeChart: ({ timeRange }: any) => (
    <div data-testid="participation-chart">Participation Chart ({timeRange})</div>
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

  it('renders stats, manage cards, and charts on the dashboard root route', () => {
    renderWithRouter();

    // Check for Stats Cards
    expect(screen.getByText(/New Accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/Questions solved/i)).toBeInTheDocument();
    expect(screen.getByText(/Time to solve per type of question/i)).toBeInTheDocument();
    expect(screen.getByText(/Number of logins/i)).toBeInTheDocument();

    // Check for Manage Cards
    expect(screen.getByText('Manage Accounts')).toBeInTheDocument();
    expect(screen.getByText('Manage Competitions')).toBeInTheDocument();
    expect(screen.getByText('Manage Questions')).toBeInTheDocument();

    // Check for charts
    expect(screen.getByTestId('questions-solved-chart')).toBeInTheDocument();
    expect(screen.getByTestId('time-to-solve-chart')).toBeInTheDocument();
    expect(screen.getByTestId('logins-chart')).toBeInTheDocument();
    expect(screen.getByTestId('participation-chart')).toBeInTheDocument();

    // Ensure Outlet is not rendered
    expect(screen.queryByTestId('mock-outlet')).not.toBeInTheDocument();
  });

  it('renders the Outlet component on a sub-route', () => {
    // Mock the pathname to simulate a nested route
    setPathname('/app/dashboard/competitions');
    
    renderWithRouter();

    // Check for Outlet content
    expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();

    // Ensure dashboard specific content is NOT rendered
    expect(screen.queryByText(/New Accounts/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('questions-solved-chart')).not.toBeInTheDocument();
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

  describe('Time range filter', () => {
    it('renders all three time range buttons', () => {
      renderWithRouter();

      expect(screen.getByText('Last 3 months')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    });

    it('defaults to 3 months time range', () => {
      renderWithRouter();

      // Check that charts receive 3months as default
      expect(screen.getByText('Questions Chart (3months)')).toBeInTheDocument();
      expect(screen.getByText('Time Chart (3months)')).toBeInTheDocument();
      expect(screen.getByText('Logins Chart (3months)')).toBeInTheDocument();
      expect(screen.getByText('Participation Chart (3months)')).toBeInTheDocument();
    });

    it('updates charts when 30 days button is clicked', () => {
      renderWithRouter();

      // Click the 30 days button
      const button30Days = screen.getByText('Last 30 days');
      fireEvent.click(button30Days);

      // Check that charts update to 30days
      expect(screen.getByText('Questions Chart (30days)')).toBeInTheDocument();
      expect(screen.getByText('Time Chart (30days)')).toBeInTheDocument();
      expect(screen.getByText('Logins Chart (30days)')).toBeInTheDocument();
      expect(screen.getByText('Participation Chart (30days)')).toBeInTheDocument();
    });

    it('updates charts when 7 days button is clicked', () => {
      renderWithRouter();

      // Click the 7 days button
      const button7Days = screen.getByText('Last 7 days');
      fireEvent.click(button7Days);

      // Check that charts update to 7days
      expect(screen.getByText('Questions Chart (7days)')).toBeInTheDocument();
      expect(screen.getByText('Time Chart (7days)')).toBeInTheDocument();
      expect(screen.getByText('Logins Chart (7days)')).toBeInTheDocument();
      expect(screen.getByText('Participation Chart (7days)')).toBeInTheDocument();
    });

    it('updates New Accounts stats when time range changes', () => {
      renderWithRouter();

      // Default should show 25
      expect(screen.getByText(/New Accounts: 25/i)).toBeInTheDocument();

      // Click 30 days
      fireEvent.click(screen.getByText('Last 30 days'));
      expect(screen.getByText(/New Accounts: 20/i)).toBeInTheDocument();

      // Click 7 days
      fireEvent.click(screen.getByText('Last 7 days'));
      expect(screen.getByText(/New Accounts: 8/i)).toBeInTheDocument();
    });
  });

  describe('Container styling', () => {
    it('renders stats in a white rounded container', () => {
      const { container } = renderWithRouter();

      const statsContainer = container.querySelector('.bg-white.rounded-2xl.shadow-md');
      expect(statsContainer).toBeInTheDocument();
    });
  });
});