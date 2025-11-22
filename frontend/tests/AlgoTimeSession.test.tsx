import { render, screen, fireEvent } from '@testing-library/react';
import { AlgoTimeSessionForm } from '../src/components/forms/AlgoTimeForm'
import { SessionQuestionSelector } from '../src/components/algotime/SessionQuestionSelector';

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

describe('AlgoTimeSessionForm', () => {
  test('renders general information section', () => {
    render(<AlgoTimeSessionForm />);
    
    expect(screen.getByText('General Information')).toBeInTheDocument();
  });

  test('renders select questions section', () => {
    render(<AlgoTimeSessionForm />);
    
    expect(screen.getByText('Select Questions for Sessions')).toBeInTheDocument();
  });

  test('shows validation error when submitting empty form', () => {
    render(<AlgoTimeSessionForm />);
    
    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Incomplete general information.')).toBeInTheDocument();
  });

  test('clears date input when reset button is clicked', () => {
    render(<AlgoTimeSessionForm />);
    
    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD');
    fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
    expect(dateInput).toHaveValue('2025-12-25');
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    expect(dateInput).toHaveValue('');
  });
});