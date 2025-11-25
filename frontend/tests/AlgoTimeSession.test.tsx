import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlgoTimeSessionForm } from '../src/components/forms/AlgoTimeForm';
import { logFrontend } from '../src/api/logFrontend'; // Import logFrontend

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the API calls
jest.mock('@/api/homepageQuestions', () => ({
  getQuestions: jest.fn(() => Promise.resolve([
    {
      id: 1,
      questionTitle: 'Test Question 1',
      difficulty: 'Easy',
    },
    {
      id: 2,
      questionTitle: 'Test Question 2',
      difficulty: 'Medium',
    },
  ])),
}));

// Mock logFrontend
jest.mock('../src/api/logFrontend', () => ({
  logFrontend: jest.fn(),
}));

describe('AlgoTimeSessionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders general information section', async () => {
    render(<AlgoTimeSessionForm />);
    
    await waitFor(() => {
      expect(screen.getByText('General Information')).toBeInTheDocument();
    });
  });

  test('renders select questions section', async () => {
    render(<AlgoTimeSessionForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Select Questions for Sessions')).toBeInTheDocument();
    });
  });

  test('shows validation error when submitting empty form', async () => {
    render(<AlgoTimeSessionForm />);
    
    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
    });
  });

  test('clears date input when reset button is clicked', async () => {
    render(<AlgoTimeSessionForm />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument();
    });
    
    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
    expect(dateInput.value).toBe('2025-12-25');
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    expect(dateInput.value).toBe('');
  });

  test('does not show validation error initially', async () => {
    render(<AlgoTimeSessionForm />);
    
    await waitFor(() => {
      expect(screen.getByText('General Information')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Incomplete general information.')).not.toBeInTheDocument();
  });

  test('clears validation error after reset', async () => {
    render(<AlgoTimeSessionForm />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
    
    // Try to submit to trigger validation
    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
    });
    
    // Click reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByText('Incomplete general information.')).not.toBeInTheDocument();
    });
  });
});