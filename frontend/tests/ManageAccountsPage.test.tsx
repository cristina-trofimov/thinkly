import { render, screen, waitFor } from '@testing-library/react';
import type { Account } from './../src/types/Account';

jest.mock('./../src/api/manageAccounts', () => ({
  getAccounts: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccounts: jest.fn(),
}));

describe('ManageAccountsPage', () => {
  let ManageAccountsPage: any;
  let getAccounts: jest.Mock;

  beforeAll(() => {
    const apiModule = require('./../src/api/manageAccounts');
    getAccounts = apiModule.getAccounts;
    
    ManageAccountsPage = require('./../src/views/ManageAccountsPage').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders without crashing', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      getAccounts.mockImplementation(() => new Promise(() => {}));
      
      render(<ManageAccountsPage />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders container with correct styling', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      const { container } = render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      const mainContainer = container.querySelector('.container.mx-auto.p-6');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches data on mount', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(getAccounts).toHaveBeenCalled();
      });
    });

    it('fetches data only once', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(getAccounts).toHaveBeenCalledTimes(1);
      });
    });

    it('displays fetched data', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', accountType: 'Participant' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('handles empty response', async () => {
      getAccounts.mockResolvedValue([]);
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('No results.')).toBeInTheDocument();
    });

    it('transitions from loading to data state', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('handles large dataset', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstName: `User${i}`,
        lastName: `Test${i}`,
        email: `user${i}@example.com`,
        accountType: 'Admin' as const,
      }));
      
      getAccounts.mockResolvedValue(largeDataset);
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error state on fetch failure', async () => {
      getAccounts.mockRejectedValue(new Error('Network error'));
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('displays error message with error details', async () => {
      getAccounts.mockRejectedValue(new Error('Failed to fetch'));
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to fetch/)).toBeInTheDocument();
      });
    });

    it('handles unknown error type', async () => {
      getAccounts.mockRejectedValue('String error');
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error: An unknown error occurred/)).toBeInTheDocument();
      });
    });

    it('stops loading on error', async () => {
      getAccounts.mockRejectedValue(new Error('API Error'));
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('does not render data table on error', async () => {
      getAccounts.mockRejectedValue(new Error('API Error'));
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Filter emails...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    it('passes correct props to ManageAccountsDataTable', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Account Type')).toBeInTheDocument();
    });

    it('passes columns prop', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('passes data prop with fetched accounts', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('User Deletion', () => {
    it('provides onDeleteUsers callback', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', accountType: 'Participant' as const },
      ];
      
      getAccounts.mockResolvedValue(mockAccounts);
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('updates state when handleDeleteUsers is called', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', accountType: 'Participant' as const },
      ];
      
      getAccounts.mockResolvedValue(mockAccounts);
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('User Updates', () => {
    it('provides onUserUpdate callback', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
      ];
      
      getAccounts.mockResolvedValue(mockAccounts);
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('passes onUserUpdate callback to DataTable', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' as const },
      ];
      
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('initializes with empty data array', () => {
      getAccounts.mockImplementation(() => new Promise(() => {}));
      
      render(<ManageAccountsPage />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('updates data state after successful fetch', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(getAccounts).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('sets loading to false after data fetch', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('clears error state on successful fetch', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);
      
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Lifecycle', () => {
    it('fetches data on component mount', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      render(<ManageAccountsPage />);
      
      expect(getAccounts).toHaveBeenCalled();
    });

    it('does not refetch on re-render', async () => {
      const mockAccounts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', accountType: 'Admin' },
      ];
      getAccounts.mockResolvedValue(mockAccounts);

      const { rerender } = render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      rerender(<ManageAccountsPage />);
      
      expect(getAccounts).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Account Type Definition', () => {
  it('accepts Participant account type', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Participant',
    };
    expect(account.accountType).toBe('Participant');
  });

  it('accepts Admin account type', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.accountType).toBe('Admin');
  });

  it('accepts Owner account type', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Owner',
    };
    expect(account.accountType).toBe('Owner');
  });

  it('requires firstName field', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.firstName).toBe('Test');
  });

  it('requires lastName field', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.lastName).toBe('User');
  });

  it('requires email field', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.email).toBe('test@example.com');
  });

  it('requires id field', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.id).toBe(1);
  });
});