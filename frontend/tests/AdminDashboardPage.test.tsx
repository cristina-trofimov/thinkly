import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from '../src/views/admin/AdminDashboardPage';
import userEvent from '@testing-library/user-event';

// --- MOCK SETUP ---

// Mock the AdminDashboardAPI
jest.mock('@/api/AdminDashboardAPI', () => ({
  getDashboardOverview: jest.fn().mockResolvedValue({
    recent_accounts: [
      { name: 'John Doe', info: 'john@example.com', avatarUrl: null },
      { name: 'Jane Smith', info: 'jane@example.com', avatarUrl: null },
    ],
    recent_competitions: [
      { name: 'Competition 1', info: '01/01/26', color: 'var(--color-chart-1)' },
    ],
    recent_questions: [
      { name: 'Question 1', info: 'Date added: 01/01/26' },
    ],
    recent_algotime_sessions: [
      { name: 'Session 1', info: 'Date added: 01/01/26' },
    ],
  }),
  getNewAccountsStats: jest.fn().mockImplementation((timeRange) => {
    const stats: Record<string, any> = {
      '3months': { value: 25, subtitle: 'Up 10%', trend: '+10%', description: 'More users joining' },
      '30days': { value: 20, subtitle: 'Up 5%', trend: '+5%', description: 'More users joining' },
      '7days': { value: 8, subtitle: 'Up 2%', trend: '+2%', description: 'More users joining' },
    };
    return Promise.resolve(stats[timeRange] || stats['3months']);
  }),
  getQuestionsSolvedStats: jest.fn().mockResolvedValue([
    { name: 'Easy', value: 10, color: 'var(--chart-1)' },
    { name: 'Medium', value: 20, color: 'var(--chart-2)' },
    { name: 'Hard', value: 5, color: 'var(--chart-3)' },
  ]),
  getTimeToSolveStats: jest.fn().mockResolvedValue([
    { type: 'Easy', time: 5, color: 'var(--chart-1)' },
    { type: 'Medium', time: 15, color: 'var(--chart-2)' },
    { type: 'Hard', time: 30, color: 'var(--chart-3)' },
  ]),
  getLoginsStats: jest.fn().mockResolvedValue([
    { month: 'Jan', logins: 100 },
    { month: 'Feb', logins: 150 },
  ]),
  getParticipationStats: jest.fn().mockResolvedValue([
    { date: 'Mon', participation: 50 },
    { date: 'Tue', participation: 75 },
  ]),
}));

// Mocking react-router-dom Outlet component
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  // Mock Outlet to display identifiable content
  Outlet: () => <div data-testid="mock-outlet">Mock Outlet Content</div>,
}));

// Mock Select component to make it testable
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-wrapper" data-value={value}>
      {children}
      <select 
        data-testid="time-range-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="3months">Last 3 months</option>
        <option value="30days">Last 30 days</option>
        <option value="7days">Last 7 days</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectLabel: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
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

jest.mock('../src/components/dashboardCards/StatsCard', () => ({
  StatsCard: ({ title, value, children }: any) => (
    <div data-testid="mock-stat-card">
      {title}
      {value && `: ${value}`}
      {children && <div data-testid="chart-child">{children}</div>}
    </div>
  ),
}));

jest.mock('../src/components/dashboardCards/ManageCard', () => ({
  ManageCard: ({ title }: any) => <div data-testid="mock-manage-card">{title}</div>,
}));

jest.mock('../src/components/dashboardCharts/QuestionsSolvedChart', () => ({
  QuestionsSolvedChart: ({ data, loading }: any) => (
    <div data-testid="questions-solved-chart">Questions Chart (items: {data?.length || 0})</div>
  ),
}));

jest.mock('../src/components/dashboardCharts/TimeToSolveChart', () => ({
  TimeToSolveChart: ({ data, loading }: any) => (
    <div data-testid="time-to-solve-chart">Time Chart (items: {data?.length || 0})</div>
  ),
}));

jest.mock('../src/components/dashboardCharts/NumberOfLoginsChart', () => ({
  NumberOfLoginsChart: ({ data, loading }: any) => (
    <div data-testid="logins-chart">Logins Chart (items: {data?.length || 0})</div>
  ),
}));

jest.mock('../src/components/dashboardCharts/ParticipationOverTimeChart', () => ({
  ParticipationOverTimeChart: ({ data, timeRange, loading }: any) => (
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
    it('defaults to 3 months time range', async () => {
      renderWithRouter();

      const select = screen.getByTestId('time-range-select') as HTMLSelectElement;
      expect(select.value).toBe('3months');

      // Check that charts are rendered
      await waitFor(() => {
        expect(screen.getByTestId('questions-solved-chart')).toBeInTheDocument();
        expect(screen.getByTestId('time-to-solve-chart')).toBeInTheDocument();
        expect(screen.getByTestId('logins-chart')).toBeInTheDocument();
        expect(screen.getByText('Participation Chart (3months)')).toBeInTheDocument();
      });
    });

    it('updates participation chart when 30 days is selected', async () => {
      renderWithRouter();

      const select = screen.getByTestId('time-range-select');
      fireEvent.change(select, { target: { value: '30days' } });

      await waitFor(() => {
        expect(screen.getByText('Participation Chart (30days)')).toBeInTheDocument();
      });
    });

    it('updates participation chart when 7 days is selected', async () => {
      renderWithRouter();

      const select = screen.getByTestId('time-range-select');
      fireEvent.change(select, { target: { value: '7days' } });

      await waitFor(() => {
        expect(screen.getByText('Participation Chart (7days)')).toBeInTheDocument();
      });
    });

    it('updates New Accounts stats when time range changes', async () => {
      renderWithRouter();

      // Wait for initial load with default 3months (value: 25)
      await waitFor(() => {
        expect(screen.getByText(/25/)).toBeInTheDocument();
      });

      const select = screen.getByTestId('time-range-select');

      // Change to 30 days (value: 20)
      fireEvent.change(select, { target: { value: '30days' } });
      await waitFor(() => {
        expect(screen.getByText(/20/)).toBeInTheDocument();
      });

      // Change to 7 days (value: 8)
      fireEvent.change(select, { target: { value: '7days' } });
      await waitFor(() => {
        expect(screen.getByText(/\b8\b/)).toBeInTheDocument();
      });
    });
  });

  describe('Container styling', () => {
    it('renders stats in a rounded container with shadow', () => {
      const { container } = renderWithRouter();

      const statsContainer = container.querySelector('.rounded-2xl.shadow-md');
      expect(statsContainer).toBeInTheDocument();
    });
  });
});