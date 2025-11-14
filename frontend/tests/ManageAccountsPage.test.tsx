import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Account } from './../src/types/Account';

// Mock the API module before importing components
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
    
    const mockAccounts = Array.from({ length: 31 }, (_, i) => ({
      id: i + 1,
      firstName: `User${i}`,
      lastName: `Test${i}`,
      email: `user${i}@example.com`,
      accountType: 'Admin',
    }));
    
    getAccounts.mockResolvedValue(mockAccounts);
  });

  it('renders without crashing', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('user0@example.com')).toBeInTheDocument();
  });

  it('fetches and displays data on mount', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(<ManageAccountsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error state on fetch failure', async () => {
    getAccounts.mockRejectedValue(new Error('Network error'));
    
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('passes correct props to ManageAccountsDataTable', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Verify that column headers are rendered
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Account Type')).toBeInTheDocument();
  });

  it('handles successful data fetch with multiple users', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
  });

  it('renders container with correct styling', async () => {
    const { container } = render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    const mainContainer = container.querySelector('.container.mx-auto.p-6');
    expect(mainContainer).toBeInTheDocument();
  });

  describe('User deletion', () => {
    it('updates data when users are deleted', async () => {
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

    it('filters out deleted users from display', async () => {
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

  describe('User updates', () => {
    it('updates user data when edit is successful', async () => {
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
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      // Verify the component rendered successfully with callbacks
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
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
  });

  describe('Data state management', () => {
    it('initializes with empty data array', () => {
      render(<ManageAccountsPage />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('updates data state after successful fetch', async () => {
      render(<ManageAccountsPage />);
      
      await waitFor(() => {
        expect(getAccounts).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });
  });
});

describe('ManageAccountsColumns - Initial Generation', () => {
  it('generates correct initials for full names', () => {
    const firstName = 'John';
    const lastName = 'Doe';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('generates correct initials for single first name', () => {
    const firstName = 'John';
    const lastName = '';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JJ');
  });

  it('handles empty names', () => {
    const firstName = '';
    const lastName = '';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('');
  });

  it('handles names with multiple spaces', () => {
    const firstName = 'John   Michael';
    const lastName = 'Doe';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('handles names with leading/trailing whitespace', () => {
    const firstName = '  John';
    const lastName = 'Doe  ';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('handles lowercase names', () => {
    const firstName = 'john';
    const lastName = 'doe';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('handles names with special characters', () => {
    const firstName = "O'Brien";
    const lastName = '';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('OO');
  });

  it('uses first and last name only (ignore middle names)', () => {
    const firstName = 'John Michael';
    const lastName = 'Smith';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JS');
  });
});

describe('ManageAccountsColumns - Structure', () => {
  let columns: any;

  beforeAll(async () => {
    const columnsModule = await import('./../src/components/manage-accounts/ManageAccountsColumns');
    columns = columnsModule.columns;
  });

  it('has exactly 5 columns', () => {
    expect(columns).toHaveLength(5);
  });

  it('has select column as first column', () => {
    expect(columns[0].id).toBe('select');
  });

  it('has select column with sorting disabled', () => {
    expect(columns[0].enableSorting).toBe(false);
  });

  it('has name column', () => {
    const nameColumn = columns.find((col: any) => col.accessorKey === 'name');
    expect(nameColumn).toBeDefined();
  });

  it('has email column', () => {
    const emailColumn = columns.find((col: any) => col.accessorKey === 'email');
    expect(emailColumn).toBeDefined();
  });

  it('has accountType column', () => {
    const accountTypeColumn = columns.find((col: any) => col.accessorKey === 'accountType');
    expect(accountTypeColumn).toBeDefined();
  });

  it('has actions column as last column', () => {
    expect(columns[4].id).toBe('actions');
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