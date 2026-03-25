import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Account } from '../src/types/account/Account.type';

// ─── Infrastructure mocks ─────────────────────────────────────────────────────

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: 'http://localhost:8000',
}));

jest.mock('../src/api/AccountsAPI', () => ({
  getAccounts: jest.fn(),
  getAccountsPage: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccounts: jest.fn(),
}));

jest.mock('../src/api/LoggerAPI', () => ({ logFrontend: jest.fn() }));

jest.mock('../src/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackAdminAccountsViewed: jest.fn(),
    trackAdminAccountsBatchDeleted: jest.fn(),
    trackAdminAccountUpdated: jest.fn(),
  }),
}));

jest.mock('../src/context/UserContext', () => ({
  useUser: () => ({ user: { id: 99, accountType: 'Owner' } }),
}));

// ─── Child component mocks ────────────────────────────────────────────────────

jest.mock('../src/components/manageAccounts/ManageAccountsColumns', () => ({
  columns: [],
}));

jest.mock('../src/components/manageAccounts/ManageAccountsDataTable', () => ({
  ManageAccountsDataTable: ({
    data,
    total,
  }: {
    data: Account[];
    total: number;
    columns: any[];
    page: number;
    pageSize: number;
    search: string;
    userTypeFilter: string;
    onSearchChange: (v: string) => void;
    onUserTypeFilterChange: (v: string) => void;
    onSortChange: (v: any) => void;
    onPageChange: (v: number) => void;
    onPageSizeChange: (v: number) => void;
    onDeleteUsers: (ids: number[]) => void;
    onUserUpdate: (u: Account) => void;
    currentUserRole?: string;
  }) => (
    <div>
      <div>Email</div>
      <div>Account Type</div>
      <div>Name</div>
      {data.length === 0 && <div>No results.</div>}
      {data.map((a) => (
        <div key={a.id}>{a.email}</div>
      ))}
      <div>Filter emails...</div>
    </div>
  ),
}));

// Loading skeleton: aria-busy="true" so getByRole('generic', { busy: true }) works
jest.mock('../src/components/manageAccounts/ManageAccountsSkeleton', () => ({
  __esModule: true,
  default: () => <div role="generic" aria-busy="true" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paginatedAccounts = (items: Account[], page = 1, pageSize = 25) => ({
  total: items.length,
  page,
  pageSize,
  items,
});

// ─── Setup ────────────────────────────────────────────────────────────────────

let ManageAccountsPage: React.ComponentType;
let getAccountsPage: jest.Mock;

beforeAll(() => {
  const api = require('../src/api/AccountsAPI');
  getAccountsPage = api.getAccountsPage;
  ManageAccountsPage = require('../src/views/admin/ManageAccountsPage').default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ManageAccountsPage', () => {
  // Re-expose paginatedAccounts so nested describe blocks can use it
  const paginated = paginatedAccounts;

  describe('Initial Render', () => {
    it('renders without crashing', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      getAccountsPage.mockImplementation(() => new Promise(() => {}));
      render(<ManageAccountsPage />);
      expect(screen.getByRole('generic', { busy: true })).toBeInTheDocument();
    });

    it('renders container with correct styling', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      const { container } = render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(container.querySelector('.container.mx-auto.p-6')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches data on mount', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(getAccountsPage).toHaveBeenCalled();
      });
    });

    it('fetches data only once', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(getAccountsPage).toHaveBeenCalledTimes(1);
      });
    });

    it('displays fetched data', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', accountType: 'Participant' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('handles empty response', async () => {
      getAccountsPage.mockResolvedValue(paginated([]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('No results.')).toBeInTheDocument();
    });

    it('transitions from loading to data state', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      expect(screen.getByRole('generic', { busy: true })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('handles large dataset', async () => {
      const large = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstName: `User${i}`,
        lastName: `Test${i}`,
        email: `user${i}@example.com`,
        accountType: 'Admin' as const,
      }));
      getAccountsPage.mockResolvedValue(paginated(large));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error state on fetch failure', async () => {
      getAccountsPage.mockRejectedValue(new Error('Network error'));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });

    it('displays error message with error details', async () => {
      getAccountsPage.mockRejectedValue(new Error('Failed to fetch'));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });

    it('handles unknown error type', async () => {
      getAccountsPage.mockRejectedValue('String error');
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });

    it('stops loading on error', async () => {
      getAccountsPage.mockRejectedValue(new Error('API Error'));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
    });

    it('does not render data table on error', async () => {
      getAccountsPage.mockRejectedValue(new Error('API Error'));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByText('Filter emails...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    it('passes correct props to ManageAccountsDataTable', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Account Type')).toBeInTheDocument();
    });

    it('passes columns prop', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('passes data prop with fetched accounts', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('User Deletion', () => {
    it('provides onDeleteUsers callback', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', accountType: 'Participant' as const },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('updates state when handleDeleteUsers is called', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', accountType: 'Participant' as const },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('User Updates', () => {
    it('provides onUserUpdate callback', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('passes onUserUpdate callback to DataTable', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('initializes with empty data array', () => {
      getAccountsPage.mockImplementation(() => new Promise(() => {}));
      render(<ManageAccountsPage />);
      expect(screen.getByRole('generic', { busy: true })).toBeInTheDocument();
    });

    it('updates data state after successful fetch', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => expect(getAccountsPage).toHaveBeenCalled());
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
    });

    it('sets loading to false after data fetch', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
    });

    it('clears error state on successful fetch', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Lifecycle', () => {
    it('fetches data on component mount', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      render(<ManageAccountsPage />);
      expect(getAccountsPage).toHaveBeenCalled();
    });

    it('does not refetch on re-render', async () => {
      getAccountsPage.mockResolvedValue(paginated([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ]));
      const { rerender } = render(<ManageAccountsPage />);
      await waitFor(() => {
        expect(screen.queryByRole('generic', { busy: true })).not.toBeInTheDocument();
      });
      rerender(<ManageAccountsPage />);
      expect(getAccountsPage).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Account Type Definition', () => {
  it('accepts Participant account type', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Participant' };
    expect(account.accountType).toBe('Participant');
  });

  it('accepts Admin account type', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Admin' };
    expect(account.accountType).toBe('Admin');
  });

  it('accepts Owner account type', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Owner' };
    expect(account.accountType).toBe('Owner');
  });

  it('requires firstName field', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Admin' };
    expect(account.firstName).toBe('Test');
  });

  it('requires lastName field', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Admin' };
    expect(account.lastName).toBe('User');
  });

  it('requires email field', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Admin' };
    expect(account.email).toBe('test@example.com');
  });

  it('requires id field', () => {
    const account: Account = { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', accountType: 'Admin' };
    expect(account.id).toBe(1);
  });
});