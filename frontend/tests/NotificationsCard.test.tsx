import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsCard } from '../src/components/createActivity/NotificationsCard';

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

    test('updates custom reminder date-time', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      // Select by type is safer than index
      const dateInput = container.querySelector('input[type="datetime-local"]');
      if (!dateInput) throw new Error("Date input not found");
      
      fireEvent.change(dateInput, { target: { value: '2026-12-25T12:00' } });
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ sendAtLocal: '2026-12-25T12:00' });
    });
  });

  describe('Form Field Interactions', () => {
    test('updates "To" field when emailToAll is false', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} emailToAll={false} />);
      
      // We look for the input that currently holds the 'to' value
      const toInput = container.querySelector(`input[value="${mockEmailData.to}"]`);
      
      fireEvent.change(toInput!, { target: { value: 'new@example.com' } });
      expect(mockProps.onEmailDataChange).toHaveBeenCalledWith({ to: 'new@example.com' });
    });

    test('updates Subject field', () => {
      const { container } = render(<NotificationsCard {...mockProps} emailEnabled={true} />);
      
      // Select the input that currently holds the 'subject' value
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
      
      // Use explicit attribute selectors to verify values
      const subjectInput = container.querySelector(`input[value="${mockEmailData.subject}"]`);
      const bodyInput = container.querySelector('textarea');
      const dateInput = container.querySelector('input[type="datetime-local"]');

      expect(subjectInput).toBeInTheDocument();
      expect(bodyInput).toHaveValue(mockEmailData.body);
      expect(dateInput).toHaveValue(mockEmailData.sendAtLocal);
    });
  });
});