import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsCard } from '../src/components/createActivity/NotificationsCard';

describe('NotificationsCard', () => {
  const mockEmailData = {
    to: 'test@example.com',
    subject: 'Session Reminder',
    text: 'Hello!',
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
      // Subject field should not exist yet
      expect(screen.queryByLabelText(/Subject/i)).not.toBeInTheDocument();
    });

    test('hides "To" field when "Send to all participants" is checked', () => {
      render(<NotificationsCard {...mockProps} emailEnabled={true} emailToAll={true} />);
      
      expect(screen.queryByLabelText(/To \(comma-separated\)/i)).not.toBeInTheDocument();
    });
  });

  describe('Interactions & Callbacks', () => {
    test('calls setEmailEnabled when the main switch is toggled', () => {
      render(<NotificationsCard {...mockProps} />);
      
      const switchEl = screen.getByLabelText(/Enable Emails/i);
      fireEvent.click(switchEl);
      
      expect(mockProps.setEmailEnabled).toHaveBeenCalledWith(true);
    });

    test('updates custom reminder date-time', () => {
      render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      
      const dateInput = screen.getByLabelText(/Additional custom reminder/i);
      fireEvent.change(dateInput, { target: { value: '2026-12-25T12:00' } });
      
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ sendAtLocal: '2026-12-25T12:00' });
    });
  });
});