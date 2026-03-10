import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EditAlgoTimeSessionDialog } from '../src/components/algotime/EditAlgotimeDialog';
import { getAlgotimeById } from '../src/api/AlgotimeAPI';
import { getQuestions } from '../src/api/QuestionsAPI';
import { toast } from 'sonner';
import { Question } from '../src/types/questions/Question.type';
import React from 'react';

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/api/AlgotimeAPI');
jest.mock('@/api/QuestionsAPI');
jest.mock('@/api/LoggerAPI');
jest.mock('sonner');

// Mock AlgoTimeSessionForm to simplify dialog wrapper testing
jest.mock('@/components/forms/AlgoTimeForm', () => ({
  AlgoTimeSessionForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="mock-form">
      <button onClick={onSuccess}>Save Changes</button>
    </div>
  ),
}));

const mockSession = {
  eventName: 'Winter AlgoTime 2025',
  startTime: new Date('2025-12-28T17:30:00'),
  endTime: new Date('2025-12-28T18:30:00'),
  questionCooldown: 300,
  location: 'Room 101',
  questions: [
    { questionId: 1 },
    { questionId: 2 },
  ],
};

const mockQuestions: Question[] = [
  {
    question_id: 1,
    question_name: 'Two Sum',
    difficulty: 'Easy',
    question_description: '',
    media: '',
    language_specific_properties: [],
    tags: [],
    testcases: [],
    created_at: new Date(),
    last_modified_at: new Date(),
  },
  {
    question_id: 2,
    question_name: 'Binary Search',
    difficulty: 'Medium',
    question_description: '',
    media: '',
    language_specific_properties: [],
    tags: [],
    testcases: [],
    created_at: new Date(),
    last_modified_at: new Date(),
  },
];

describe('EditAlgoTimeSessionDialog', () => {
    const mockOnOpenChange = jest.fn();
    const mockOnSuccess = jest.fn();
    const sessionId = 1;
  
    beforeEach(() => {
      jest.clearAllMocks();
      (getAlgotimeById as jest.Mock).mockResolvedValue(mockSession);
      (getQuestions as jest.Mock).mockResolvedValue(mockQuestions);
    });
  
    it('does not load data when dialog is closed', () => {
      render(
        <EditAlgoTimeSessionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
      expect(getAlgotimeById).not.toHaveBeenCalled();
    });
  
    it('fetches and displays session data in view mode', async () => {
      render(
        <EditAlgoTimeSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
  
      await waitFor(() => {
        expect(screen.getByText('View AlgoTime Session')).toBeInTheDocument();
        expect(screen.getByText('Winter AlgoTime 2025')).toBeInTheDocument();
        expect(screen.getByText('Room 101')).toBeInTheDocument();
        expect(screen.getByText('300s')).toBeInTheDocument();
        expect(screen.getByText('Two Sum')).toBeInTheDocument();
        expect(screen.getByText('Binary Search')).toBeInTheDocument();
      });
    });
  
    it('switches to edit mode and saves successfully', async () => {
      render(
        <EditAlgoTimeSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
  
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
  
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  
      await waitFor(() => {
        expect(screen.getByTestId('mock-form')).toBeInTheDocument();
      });
  
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
  
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  
    it('shows error toast when API fails', async () => {
      (getAlgotimeById as jest.Mock).mockRejectedValue(new Error('Network error'));
  
      render(
        <EditAlgoTimeSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
  
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load session details');
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  
    it('resets to view mode when dialog is closed and reopened', async () => {
      const { rerender } = render(
        <EditAlgoTimeSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
  
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
  
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  
      rerender(
        <EditAlgoTimeSessionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
  
      rerender(
        <EditAlgoTimeSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionId={sessionId}
          onSuccess={mockOnSuccess}
        />
      );
  
      await waitFor(() => {
        expect(screen.getByText('View AlgoTime Session')).toBeInTheDocument();
      });
    });
  });