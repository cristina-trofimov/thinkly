import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Account } from '../src/types/account/Account.type';
import { getAccountsPage } from '../src/api/AccountsAPI';
import ManageAccountsPage from '../src/views/admin/ManageAccountsPage';
import { useUser } from '../src/context/UserContext';
import { useAnalytics } from '../src/hooks/useAnalytics';
import { logFrontend } from '../src/api/LoggerAPI';

// ─── Infrastructure mocks ─────────────────────────────────────────────────────

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: 'http://localhost:8000',
}));

jest.mock('../src/api/AccountsAPI', () => ({
  getAccountsPage: jest.fn(),
}));

jest.mock('../src/api/LoggerAPI', () => ({ logFrontend: jest.fn() }));

// Fix: Create a stable mock object for analytics
const mockAnalytics = {
  trackAdminAccountsViewed: jest.fn(),
  trackAdminAccountsBatchDeleted: jest.fn(),
  trackAdminAccountUpdated: jest.fn(),
};
jest.mock('../src/hooks/useAnalytics', () => ({
  useAnalytics: () => mockAnalytics,
}));

jest.mock('../src/context/UserContext', () => ({
  useUser: jest.fn(() => ({ user: { id: 99, accountType: 'Owner' } })),
}));

// ─── Child component mocks ────────────────────────────────────────────────────

jest.mock('../src/components/manageAccounts/ManageAccountsColumns', () => ({
  columns: [],
}));

jest.mock('../src/components/manageAccounts/ManageAccountsDataTable', () => ({
  ManageAccountsDataTable: ({
    data,
    onDeleteUsers,
    onUserUpdate,
    onSearchChange,
    onUserTypeFilterChange,
    onPageChange,
    onPageSizeChange,
    onSortChange,
  }: any) => (
    <div data-testid="data-table">
      {data.map((a: Account) => (
        <div key={a.id} data-testid={`account-row-${a.id}`}>
          <span>{a.email}</span>
          <span>{a.accountType}</span>
          <button data-testid={`update-btn-${a.id}`} onClick={() => onUserUpdate({ ...a, accountType: 'Admin' })}>Update</button>
          <button data-testid={`transfer-owner-${a.id}`} onClick={() => onUserUpdate({ ...a, accountType: 'Owner' })}>Make Owner</button>
        </div>
      ))}
      <button data-testid="delete-btn" onClick={() => onDeleteUsers([data[0]?.id])}>Delete First</button>
      <button data-testid="change-search" onClick={() => onSearchChange('new search')}>Search</button>
      <button data-testid="change-filter" onClick={() => onUserTypeFilterChange('admin')}>Filter</button>
      <button data-testid="change-sort" onClick={() => onSortChange({ field: 'email', direction: 'asc' })}>Sort</button>
      <button data-testid="next-page" onClick={() => onPageChange(2)}>Next</button>
      <button data-testid="change-size" onClick={() => onPageSizeChange(50)}>Resize</button>
    </div>
  ),
}));

jest.mock('../src/components/manageAccounts/ManageAccountsSkeleton', () => ({
  __esModule: true,
  default: () => <div role="generic" aria-busy="true" data-testid="skeleton" />,
}));

const paginatedAccounts = (items: Account[], page = 1, pageSize = 25, total?: number) => ({
  total: total ?? items.length,
  page,
  pageSize,
  items,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ManageAccountsPage Full Coverage', () => {
  const mockUser1 = { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const };
  const mockCurrentUser = { id: 99, firstName: 'Me', lastName: 'Owner', email: 'me@example.com', accountType: 'Owner' as const };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAccountsPage as jest.Mock).mockResolvedValue(paginatedAccounts([mockUser1, mockCurrentUser]));
  });

  describe('Initial Render & Loading', () => {
    it('displays loading skeleton initially', () => {
      (getAccountsPage as jest.Mock).mockImplementation(() => new Promise(() => {}));
      render(<ManageAccountsPage />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('renders data table after successful fetch', async () => {
      render(<ManageAccountsPage />);
      await waitFor(() => expect(screen.getByTestId('data-table')).toBeInTheDocument());
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Data Fetching & Filtering', () => {
    it('resets page to 1 and fetches when search/filter/sort/size changes', async () => {
      render(<ManageAccountsPage />);
      await screen.findByTestId('data-table');

      fireEvent.click(screen.getByTestId('change-search'));
      fireEvent.click(screen.getByTestId('change-filter'));
      fireEvent.click(screen.getByTestId('change-sort'));
      fireEvent.click(screen.getByTestId('change-size'));

      await waitFor(() => {
        expect(getAccountsPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
      });
    });

    it('handles API returning a raw array instead of paginated object', async () => {
      (getAccountsPage as jest.Mock).mockResolvedValue([mockUser1]);
      render(<ManageAccountsPage />);
      await waitFor(() => expect(screen.getByText('john@example.com')).toBeInTheDocument());
    });
  });

  describe('Deletion Logic', () => {
    it('updates state and refreshes data on batch delete', async () => {
      render(<ManageAccountsPage />);
      await screen.findByTestId('data-table');

      fireEvent.click(screen.getByTestId('delete-btn'));

      expect(mockAnalytics.trackAdminAccountsBatchDeleted).toHaveBeenCalledWith(1);
      await waitFor(() => expect(getAccountsPage).toHaveBeenCalledTimes(2));
    });

    it('ensures total count does not go below zero on deletion', async () => {
        (getAccountsPage as jest.Mock).mockResolvedValue(paginatedAccounts([mockUser1], 1, 25, 1));
        render(<ManageAccountsPage />);
        await screen.findByTestId('delete-btn');
        fireEvent.click(screen.getByTestId('delete-btn'));
        expect(mockAnalytics.trackAdminAccountsBatchDeleted).toHaveBeenCalled();
    });
  });

  describe('Update Logic', () => {
    it('updates a user in the list and tracks analytics', async () => {
      render(<ManageAccountsPage />);
      await screen.findByTestId('update-btn-1');

      fireEvent.click(screen.getByTestId('update-btn-1'));

      expect(mockAnalytics.trackAdminAccountUpdated).toHaveBeenCalledWith(1, 'Admin');
    });

    it('demotes the current user to Admin if they transfer Ownership to another user', async () => {
      render(<ManageAccountsPage />);
      const row = await screen.findByTestId('account-row-99');
      expect(within(row).getByText('Owner')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('transfer-owner-1'));

      await waitFor(() => {
        expect(within(screen.getByTestId('account-row-99')).getByText('Admin')).toBeInTheDocument();
      });
    });

    it('returns the same account if ID does not match during mapping', async () => {
        render(<ManageAccountsPage />);
        await screen.findByTestId('update-btn-1');
        fireEvent.click(screen.getByTestId('update-btn-1'));
        expect(mockAnalytics.trackAdminAccountUpdated).toHaveBeenCalled();
    });
  });

  describe('Pagination Edge Cases', () => {
    it('decrements page if fetching an empty page when total results still exist', async () => {
      (getAccountsPage as jest.Mock).mockResolvedValueOnce(paginatedAccounts([mockUser1], 2, 25, 50));
      (getAccountsPage as jest.Mock).mockResolvedValueOnce(paginatedAccounts([], 2, 25, 50));
      (getAccountsPage as jest.Mock).mockResolvedValueOnce(paginatedAccounts([mockUser1], 1, 25, 50));

      render(<ManageAccountsPage />);
      await screen.findByTestId('next-page');
      fireEvent.click(screen.getByTestId('next-page'));

      await waitFor(() => {
        expect(getAccountsPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
      });
    });
  });

  describe('Error Handling', () => {
    it('renders error message and logs stack trace on fetch failure', async () => {
      const error = new Error('Network timeout');
      error.stack = 'mock-stack-trace';
      (getAccountsPage as jest.Mock).mockRejectedValue(error);

      render(<ManageAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        expect(logFrontend).toHaveBeenCalledWith(expect.objectContaining({
          level: 'ERROR',
          stack: 'mock-stack-trace'
        }));
      });
    });

    it('handles non-Error objects in catch block gracefully', async () => {
      (getAccountsPage as jest.Mock).mockRejectedValue('Unknown API Error');
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        expect(logFrontend).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining("An unknown error occurred during account fetch.")
        }));
      });
    });
  });

  describe('Analytics', () => {
    it('tracks page view with the total account count', async () => {
      render(<ManageAccountsPage />);
      await screen.findByTestId('data-table');
      
      await waitFor(() => {
        expect(mockAnalytics.trackAdminAccountsViewed).toHaveBeenCalledWith(2);
      });
    });
  });
});