import { render, screen, fireEvent } from '@testing-library/react';
import { GeneralInfoCard } from '../src/components/createActivity/GeneralInfoCard';
import React from 'react';

// Mock DatePicker
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

// Mock TimeInput
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
    test('renders empty location placeholder when no location provided', () => {
      const dataWithoutLocation = { ...mockData, location: '' };
      render(<GeneralInfoCard data={dataWithoutLocation} onChange={mockOnChange} />);
      expect(screen.getByPlaceholderText(/Online or Physical Address/i)).toHaveValue('');
    });
  });

  describe('Interactions', () => {
    test('calls onChange when name is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} showName nameRequired />);
      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New Name' } });
      expect(mockOnChange).toHaveBeenCalledWith({ name: 'New Name' });
    });

    test('calls onChange when date is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      fireEvent.change(screen.getByTestId('date'), { target: { value: '2026-12-25' } });
      expect(mockOnChange).toHaveBeenCalledWith({ date: '2026-12-25' });
    });

    test('calls onChange when startTime is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      fireEvent.change(screen.getByTestId('startTime'), { target: { value: '09:00' } });
      expect(mockOnChange).toHaveBeenCalledWith({ startTime: '09:00' });
    });

    test('calls onChange when endTime is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      fireEvent.change(screen.getByTestId('endTime'), { target: { value: '17:00' } });
      expect(mockOnChange).toHaveBeenCalledWith({ endTime: '17:00' });
    });

    test('calls onChange when location is updated', () => {
      render(<GeneralInfoCard data={mockData} onChange={mockOnChange} />);
      fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'Remote' } });
      expect(mockOnChange).toHaveBeenCalledWith({ location: 'Remote' });
    });
  });

  describe('Validation Styling', () => {
    test('applies destructive rings to Date and Time fields when errors exist', () => {
      const errors = { date: true, startTime: true, endTime: true };
      render(<GeneralInfoCard data={mockData} errors={errors} onChange={mockOnChange} />);

      expect(screen.getByTestId('date').closest('.ring-destructive')).toBeInTheDocument();
      expect(screen.getByTestId('startTime').closest('.ring-destructive')).toBeInTheDocument();
      expect(screen.getByTestId('endTime').closest('.ring-destructive')).toBeInTheDocument();
    });

  });
});