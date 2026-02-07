import { render, screen, fireEvent } from '@testing-library/react';
import { GeneralInfoCard } from '../src/components/createActivity/GeneralInfoCard'; // Adjust path as needed
import React from 'react';

// Mock DatePicker component consistent with your main test file
jest.mock('../src/helpers/DatePicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, value, onChange }: any) =>
      React.createElement('input', {
        id,
        type: 'text',
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        'data-testid': id,
      }),
  };
});

// Mock TimeInput consistent with your main test file
jest.mock('../src/helpers/TimeInput', () => {
  const React = require('react');
  return {
    TimeInput: ({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) =>
      React.createElement('input', {
        id,
        'data-testid': id,
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      }),
  };
});

describe('GeneralInfoCard', () => {
  const mockData = {
    name: 'Test Session',
    date: '2026-02-06',
    startTime: '10:00',
    endTime: '12:00',
    location: 'Montreal Office',
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders all fields with provided data', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Name/i)).toHaveValue(mockData.name);
      expect(screen.getByTestId('date')).toHaveValue(mockData.date);
      expect(screen.getByTestId('startTime')).toHaveValue(mockData.startTime);
      expect(screen.getByTestId('endTime')).toHaveValue(mockData.endTime);
      expect(screen.getByLabelText(/Location/i)).toHaveValue(mockData.location);
    });

    test('renders required asterisks for mandatory fields', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      
      // Fields with <Required /> should have '*'
      const labels = ['Name', 'Date', 'Start Time (EST)', 'End Time (EST)'];
      labels.forEach(labelText => {
        expect(screen.getByText(labelText)).toContainHTML('*');
      });
    });
  });

  describe('Interactions', () => {
    test('calls onChange when name is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      
      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New Name' } });
      expect(mockOnChange).toHaveBeenCalledWith({ name: 'New Name' });
    });

    test('calls onChange when date is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      
      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-12-25' } });
      expect(mockOnChange).toHaveBeenCalledWith({ date: '2026-12-25' });
    });

    test('calls onChange when location is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      
      fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'Remote' } });
      expect(mockOnChange).toHaveBeenCalledWith({ location: 'Remote' });
    });
  });

  describe('Validation Styling', () => {
    test('applies destructive classes when errors are present', () => {
      const errors = { name: true, date: true };
      render(<GeneralInfoCard data={mockData} errors={errors} onChange={mockOnChange} />);

      // Check Label color
      expect(screen.getByText(/Name/i)).toHaveClass('text-destructive');
      
      // Check Input border
      expect(screen.getByLabelText(/Name/i)).toHaveClass('border-destructive');
      
      // Check DatePicker wrapper (ring-destructive)
      const datePickerContainer = screen.getByTestId('date').parentElement;
      expect(datePickerContainer).toHaveClass('ring-destructive');
    });

    test('does not apply destructive classes when no errors', () => {
      render(<GeneralInfoCard data={mockData} errors={{}} onChange={mockOnChange} />);

      expect(screen.getByText(/Name/i)).not.toHaveClass('text-destructive');
      expect(screen.getByLabelText(/Name/i)).not.toHaveClass('border-destructive');
    });
  });
});