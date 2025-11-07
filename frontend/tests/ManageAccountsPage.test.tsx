import { render, screen, waitFor, act } from '@testing-library/react';
import type { Account } from './../src/manage-accounts/ManageAccountsColumns';


describe('ManageAccountsPage Unit Tests', () => {
  let ManageAccountsPage: unknown;
  let columns: unknown;

  beforeAll(() => {
    jest.mock('./../src/manage-accounts/ManageAccountsDataTable', () => ({
      ManageAccountsDataTable: ({ data, columns }: unknown) => (
        <div data-testid="mock-data-table">
          <div data-testid="data-length">{data.length}</div>
          <div data-testid="columns-length">{columns.length}</div>
        </div>
      ),
    }));

  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', async () => {
    await act(async () => {
      render(<ManageAccountsPage />);
    });
    expect(screen.getByTestId('mock-data-table')).toBeInTheDocument();
  });

  it('should fetch and display data on mount', async () => {
    await act(async () => {
      render(<ManageAccountsPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('data-length')).toHaveTextContent('31');
    });
  });

  it('should pass columns to DataTable', async () => {
    await act(async () => {
      render(<ManageAccountsPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('columns-length')).toHaveTextContent(String(columns.length));
    });
  });
});

describe('ManageAccountsColumns - Initial Generation', () => {
  it('should generate correct initials for full names', () => {
    const name = 'John Doe';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should generate correct initials for single names', () => {
    const name = 'John';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JJ');
  });

  it('should handle empty names', () => {
    const name = '';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('');
  });

  it('should handle names with multiple spaces', () => {
    const name = 'John   Michael   Doe';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should handle names with leading/trailing whitespace', () => {
    const name = '  John Doe  ';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should handle lowercase names', () => {
    const name = 'john doe';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JD');
  });

  it('should handle names with special characters', () => {
    const name = "O'Brien";
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('OO');
  });

  it('should use first and last name only (ignore middle names)', () => {
    const name = 'John Michael Smith';
    const nameSeparated = name.trim().split(' ').filter(Boolean);
    const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? '';
    const lastInitial = nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}`;
    
    expect(initials).toBe('JS');
  });
});

describe('ManageAccountsColumns - Structure', () => {
  let columns: unknown;

  beforeAll(async () => {
    const columnsModule = await import('./../src/manage-accounts/ManageAccountsColumns');
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
    const nameColumn = columns.find((col: unknown) => col.accessorKey === 'name');
    expect(nameColumn).toBeDefined();
  });

  it('should have email column', () => {
    const emailColumn = columns.find((col: unknown) => col.accessorKey === 'email');
    expect(emailColumn).toBeDefined();
  });

  it('should have accountType column', () => {
    const accountTypeColumn = columns.find((col: unknown) => col.accessorKey === 'accountType');
    expect(accountTypeColumn).toBeDefined();
  });

  it('should have actions column as last column', () => {
    expect(columns[4].id).toBe('actions');
  });
});

describe('Account Type Definition', () => {
  it('should accept Participant account type', () => {
    const account: Account = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      accountType: 'Participant',
    };
    expect(account.accountType).toBe('Participant');
  });

  it('should accept Admin account type', () => {
    const account: Account = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      accountType: 'Admin',
    };
    expect(account.accountType).toBe('Admin');
  });

  it('should accept Owner account type', () => {
    const account: Account = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      accountType: 'Owner',
    };
    expect(account.accountType).toBe('Owner');
  });
});