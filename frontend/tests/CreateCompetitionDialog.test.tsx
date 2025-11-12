/**
 * @file tests/CreateCompetitionDialog.test.tsx
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCompetitionDialog from '../src/components/dashboard/CreateCompetitionDialog';

describe('CreateCompetitionDialog', () => {
  const originalError = console.error;
  const originalLog = console.log;
  let mockOnOpenChange: jest.Mock;
  let mockFetch: jest.Mock;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-09T18:00:00.000Z')); // stable reference time
  });

  beforeEach(() => {
    mockOnOpenChange = jest.fn();
    mockFetch = jest.fn();

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('http://127.0.0.1:8000/questions/')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({}),
        });
      }
      if (url.includes('http://127.0.0.1:8000/email/send')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    (global as any).fetch = mockFetch;

    console.error = jest.fn(() => {});
    console.log = jest.fn(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    console.error = originalError;
    console.log = originalLog;
    jest.useRealTimers();
  });

  const renderOpen = () =>
    render(<CreateCompetitionDialog open={true} onOpenChange={mockOnOpenChange} />);

  const fillGeneralInfo = async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.type(screen.getByLabelText('Competition Name'), 'Valid Comp');
    await user.type(screen.getByLabelText('Date'), '2026-10-25');
    await user.type(screen.getByLabelText('Start Time'), '10:00');
    await user.type(screen.getByLabelText('End Time'), '12:00');
  };

  const selectQuestionTwoSum = async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await waitFor(() => expect(screen.getByText('Two Sum')).toBeInTheDocument());
    const row = screen.getByText('Two Sum').closest('.flex-1')!;
    const checkbox = row.parentElement!.querySelector('button,[type="checkbox"]') as HTMLElement;
    await user.click(checkbox);
  };

  const selectAnyRiddle = async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const riddleRow = screen.getByText(/Where's Waldo\?/i).closest('.flex-1')!;
    const checkbox = riddleRow.parentElement!.querySelector('button,[type="checkbox"]') as HTMLElement;
    await user.click(checkbox);
  };

  test('shows no error initially', () => {
    renderOpen();
    expect(screen.queryByText(/Incomplete general information/i)).not.toBeInTheDocument();
  });

  test('blocks submission if General Information is incomplete', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    expect(screen.getByText(/Incomplete general information\./i)).toBeInTheDocument();
    expect(mockOnOpenChange).not.toHaveBeenCalled();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('http://127.0.0.1:8000/questions/');
  });

  test('blocks submission if no Question selected', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectAnyRiddle();

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    expect(screen.getByText(/Please select at least one question/i)).toBeInTheDocument();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  test('blocks submission if no Riddle selected', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectQuestionTwoSum();

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    expect(screen.getByText(/Please select at least one riddle/i)).toBeInTheDocument();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  test('allows submission when all fields are complete', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectQuestionTwoSum();
    await selectAnyRiddle();

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));
    await waitFor(() => expect(mockOnOpenChange).toHaveBeenCalledWith(false));
  });

  test('sends email immediately when "To" is filled and no schedule is set', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectQuestionTwoSum();
    await selectAnyRiddle();

    await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
    await user.type(screen.getByLabelText('Subject'), 'Hi');
    await user.type(screen.getByLabelText('Message'), 'Body');

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    await waitFor(() => {
      expect(mockFetch.mock.calls[0][0]).toBe('http://127.0.0.1:8000/questions/');
      expect(mockFetch.mock.calls[1][0]).toBe('http://127.0.0.1:8000/email/send');
      expect(mockFetch.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ['test@example.com'],
            subject: 'Hi',
            text: 'Body',
          }),
        })
      );
    });
  });

  test('schedules email for 1 minute from now when switch is ON', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectQuestionTwoSum();
    await selectAnyRiddle();

    await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
    await user.type(screen.getByLabelText('Subject'), 'Hi');
    await user.type(screen.getByLabelText('Message'), 'Body');

    await user.click(screen.getByLabelText('Send in 1 minute'));
    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    await waitFor(() => {
      const emailCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(emailCallBody).toEqual(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: 'Hi',
          text: 'Body',
          sendAt: expect.any(String),
        })
      );
    });
  });

  test('schedules email for local time when switch is OFF and time is provided', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectQuestionTwoSum();
    await selectAnyRiddle();

    await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
    await user.type(screen.getByLabelText('Subject'), 'Hi');
    await user.type(screen.getByLabelText('Message'), 'Body');

    const localStr = '2026-10-25T12:00';
    await user.type(screen.getByLabelText('Schedule (local time)'), localStr);

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    await waitFor(() => {
      const emailCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const expectedISO = new Date(localStr).toISOString().replace('.000Z', 'Z');
      expect(emailCallBody.sendAt).toBe(expectedISO);
    });
  });

  test('logs an error if the email API call fails (HTTP 400)', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('8000/questions/')) {
        return Promise.resolve({ ok: false, json: async () => ({}) });
      }
      if (url.includes('8000/email/send')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Bad Request' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderOpen();

    await fillGeneralInfo();
    await selectQuestionTwoSum();
    await selectAnyRiddle();

    await user.type(screen.getByLabelText('To (comma-separated)'), 'test@example.com');
    await user.type(screen.getByLabelText('Subject'), 'Hi');
    await user.type(screen.getByLabelText('Message'), 'Body');

    await user.click(screen.getByRole('button', { name: /Create Competition/i }));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Email send failed:', 'Bad Request');
    });
  });
});
