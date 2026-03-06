import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsCard } from '../src/components/createActivity/NotificationsCard';

// Mock the custom DatePicker and TimeInput helpers since they're local components
// that won't resolve in the test environment
jest.mock('../src/helpers/DatePicker', () => ({
  __esModule: true,
  default: ({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) => (
    <input
      data-testid="date-picker"
      type="date"
      value={value}
      min={min}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

jest.mock('../src/helpers/TimeInput', () => ({
  TimeInput: ({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) => (
    <input
      data-testid="time-input"
      type="time"
      value={value}
      min={min}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

describe('NotificationsCard', () => {
  const mockEmailData = {
    to: 'test@example.com',
    subject: 'Session Reminder',
    body: 'Hello!',
    sendAtLocal: '2026-02-06T10:00',
    sendInOneMinute: false,
  };

  const mockProps = {
    emailEnabled: false,
    setEmailEnabled: jest.fn(),
    emailToAll: false,
    setEmailToAll: jest.fn(),
    emailData: mockEmailData,
    onEmailDataChange: jest.fn(),
    onManualEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conditional Rendering', () => {
    test('renders only the enable switch when emailEnabled is false', () => {
      render(<NotificationsCard {...mockProps} />);
      expect(screen.getByLabelText(/Enable Emails/i)).toBeInTheDocument();
      expect(screen.queryByText(/Subject/i)).not.toBeInTheDocument();
    });

    test('hides "To" field when "Send to all participants" is checked', () => {
      render(<NotificationsCard {...mockProps} emailEnabled={true} emailToAll={true} />);
      expect(screen.queryByText(/To \(comma-separated\)/i)).not.toBeInTheDocument();
    });
  });

  describe('Interactions & Callbacks', () => {
    test('calls setEmailEnabled when the main switch is toggled', () => {
      render(<NotificationsCard {...mockProps} />);
      const switchEl = screen.getByLabelText(/Enable Emails/i);
      fireEvent.click(switchEl);
      expect(mockProps.setEmailEnabled).toHaveBeenCalledWith(true);
    });

    test('updates custom reminder date when date picker changes', () => {
      render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      const dateInput = screen.getByTestId('date-picker');
      fireEvent.change(dateInput, { target: { value: '2026-12-25' } });
      // The handler combines date + existing time (10:00 from mockEmailData)
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ sendAtLocal: '2026-12-25T10:00' });
    });

    test('updates custom reminder time when time input changes', () => {
      render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      const timeInput = screen.getByTestId('time-input');
      fireEvent.change(timeInput, { target: { value: '14:30' } });
      // The handler combines existing date (2026-02-06 from mockEmailData) + new time
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ sendAtLocal: '2026-02-06T14:30' });
    });
  });

  describe('Form Field Interactions', () => {
    test('updates "To" field when emailToAll is false', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} emailToAll={false} />);
      const toInput = container.querySelector(`input[value="${mockEmailData.to}"]`);
      fireEvent.change(toInput!, { target: { value: 'new@example.com' } });
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ to: 'new@example.com' });
    });

    test('updates Subject field', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      const subjectInput = container.querySelector(`input[value="${mockEmailData.subject}"]`);
      fireEvent.change(subjectInput!, { target: { value: 'New Subject' } });
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ subject: 'New Subject' });
    });

    test('updates Message Content and calls onManualEdit', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      const bodyInput = container.querySelector('textarea');
      fireEvent.change(bodyInput!, { target: { value: 'Updated body text' } });
      expect(mockProps.onManualEdit).toHaveBeenCalledTimes(1);
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ body: 'Updated body text' });
    });

    test('calls setEmailToAll when the "Send to all" switch is toggled', () => {
      render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      const allPartSwitch = screen.getByLabelText(/Send to all participants/i);
      fireEvent.click(allPartSwitch);
      expect(mockProps.setEmailToAll).toHaveBeenCalledWith(true);
    });
  });

  describe('Edge Cases', () => {
    test('displays existing emailData values in inputs', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} />);

      const subjectInput = container.querySelector(`input[value="${mockEmailData.subject}"]`);
      const bodyInput = container.querySelector('textarea');
      const dateInput = screen.getByTestId('date-picker');
      const timeInput = screen.getByTestId('time-input');

      expect(subjectInput).toBeInTheDocument();
      expect(bodyInput).toHaveValue(mockEmailData.body);
      // sendAtLocal "2026-02-06T10:00" splits into date and time
      expect(dateInput).toHaveValue('2026-02-06');
      expect(timeInput).toHaveValue('10:00');
    });
  });
});