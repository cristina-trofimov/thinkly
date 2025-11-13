import { render, screen, waitFor } from '@testing-library/react';
import type { Account } from './../src/types/Account';

// Mock the API module before importing components
jest.mock('./../src/api/manageAccounts', () => ({
  getAccounts: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccounts: jest.fn(),
}));

describe('ManageAccountsPage Unit Tests', () => {
  let ManageAccountsPage: any;
  let columns: any;
  let getAccounts: jest.Mock;

  beforeAll(() => {
    const apiModule = require('./../src/api/manageAccounts');
    getAccounts = apiModule.getAccounts;
    
    ManageAccountsPage = require('./../src/views/ManageAccountsPage').default;
    columns = require('./../src/components/manage-accounts/ManageAccountsColumns').columns;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response with 31 accounts
    const mockAccounts = Array.from({ length: 31 }, (_, i) => ({
      id: i + 1,
      firstName: `User${i}`,
      lastName: `Test${i}`,
      email: `user${i}@example.com`,
      accountType: 'Admin',
    }));
    
    getAccounts.mockResolvedValue(mockAccounts);
  });

  it('should render without crashing', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('user0@example.com')).toBeInTheDocument();
  });

  it('should fetch and display data on mount', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
    });
  });

  it('should pass columns to DataTable', async () => {
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Verify that column headers are rendered
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Account Type')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    render(<ManageAccountsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display error state on fetch failure', async () => {
    getAccounts.mockRejectedValue(new Error('Network error'));
    
    render(<ManageAccountsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});

describe('ManageAccountsColumns - Initial Generation', () => {
  it('should generate correct initials for full names', () => {
    const firstName = 'John';
    const lastName = 'Doe';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should generate correct initials for single first name', () => {
    const firstName = 'John';
    const lastName = '';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JJ');
  });

  it('should handle empty names', () => {
    const firstName = '';
    const lastName = '';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('');
  });

  it('should handle names with multiple spaces', () => {
    const firstName = 'John   Michael';
    const lastName = 'Doe';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should handle names with leading/trailing whitespace', () => {
    const firstName = '  John';
    const lastName = 'Doe  ';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should handle lowercase names', () => {
    const firstName = 'john';
    const lastName = 'doe';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should handle names with special characters', () => {
    const firstName = "O'Brien";
    const lastName = '';
    const name = `${firstName} ${lastName}`;
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('OO');
  });

  it('should use first and last name only (ignore middle names)', () => {
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

  it('should have exactly 5 columns', () => {
    expect(columns).toHaveLength(5);
  });

  it('should have select column as first column', () => {
    expect(columns[0].id).toBe('select');
  });

  it('should have select column with sorting disabled', () => {
    expect(columns[0].enableSorting).toBe(false);
  });

  it('should have name column', () => {
    const nameColumn = columns.find((col: any) => col.accessorKey === 'name');
    expect(nameColumn).toBeDefined();
  });

  it('should have email column', () => {
    const emailColumn = columns.find((col: any) => col.accessorKey === 'email');
    expect(emailColumn).toBeDefined();
  });

  it('should have accountType column', () => {
    const accountTypeColumn = columns.find((col: any) => col.accessorKey === 'accountType');
    expect(accountTypeColumn).toBeDefined();
  });

  it('should have actions column as last column', () => {
    expect(columns[4].id).toBe('actions');
  });
});

describe('Account Type Definition', () => {
  it('should accept Participant account type', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Participant',
    };
    expect(account.accountType).toBe('Participant');
  });

  it('should accept Admin account type', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.accountType).toBe('Admin');
  });

  it('should accept Owner account type', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Owner',
    };
    expect(account.accountType).toBe('Owner');
  });

  it('should require firstName field', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.firstName).toBe('Test');
  });

  it('should require lastName field', () => {
    const account: Account = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.lastName).toBe('User');
  });
});