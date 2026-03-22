import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import { EventLeaderboard } from '../src/components/leaderboards/CodingPageLeaderboard'
import {
  getCompetitionLiveLeaderboard,
  getCurrentAlgoTimeLeaderboard,
} from '../src/api/LeaderboardsAPI'

// -------------------- MOCKS --------------------

jest.mock('../src/api/LeaderboardsAPI', () => ({
  getCompetitionLiveLeaderboard: jest.fn(),
  getCurrentAlgoTimeLeaderboard: jest.fn(),
}))

// ScoreboardDataTable renders participants as rows — keep it lightweight
jest.mock('../src/components/leaderboards/ScoreboardDataTable', () => ({
  ScoreboardDataTable: ({ participants, showSeparator }: any) => (
    <div data-testid="scoreboard-table">
      {participants.map((p: any) => (
        <div key={p.rank} data-testid={`row-${p.rank}`}>
          {p.name} — {p.total_score}pts
        </div>
      ))}
      {showSeparator && <div data-testid="separator">···</div>}
    </div>
  ),
}))

// -------------------- TEST DATA --------------------

const mockParticipants = [
  { name: 'Alice', user_id: 1, total_score: 120, problems_solved: 5, rank: 1, total_time: '01:00:00' },
  { name: 'Bob',   user_id: 2, total_score:  80, problems_solved: 3, rank: 2, total_time: '00:45:00' },
]

const mockStandingsCompetition = {
  competitionName: '',          // patched in by EventLeaderboard from eventName prop
  participants: mockParticipants,
  showSeparator: false,
}

const mockStandingsAlgoTime = {
  competitionName: 'AlgoTime Leaderboard',
  participants: mockParticipants,
  showSeparator: true,
}

const mockedGetCompetitionLive   = getCompetitionLiveLeaderboard   as jest.Mock
const mockedGetCurrentAlgoTime   = getCurrentAlgoTimeLeaderboard   as jest.Mock

// -------------------- HELPERS --------------------

const competitionProps = {
  eventId: 42,
  eventName: 'Winter Contest',
  isCompetitionEvent: true,
  currentUserId: 1,
}

const algoTimeProps = {
  eventId: 0,
  eventName: 'AlgoTime',
  isCompetitionEvent: false,
  currentUserId: 1,
}

// -------------------- SETUP --------------------

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.useRealTimers()
})

// -------------------- TESTS --------------------

describe('EventLeaderboard', () => {

  // ─── Loading state ────────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('shows a loading indicator on the initial fetch', () => {
      mockedGetCompetitionLive.mockReturnValue(new Promise(() => {})) // never resolves

      render(<EventLeaderboard {...competitionProps} />)

      expect(screen.getByText(/loading leaderboard/i)).toBeInTheDocument()
    })

    it('removes the loading indicator once data arrives', async () => {
      mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() =>
        expect(screen.queryByText(/loading leaderboard/i)).not.toBeInTheDocument()
      )
    })
  })

  // ─── Error state ──────────────────────────────────────────────────────────

  describe('Error state', () => {
    it('shows an error message when the competition fetch fails', async () => {
      mockedGetCompetitionLive.mockRejectedValue(new Error('API Error'))

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() =>
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument()
      )
    })

    it('shows an error message when the algotime fetch fails', async () => {
      mockedGetCurrentAlgoTime.mockRejectedValue(new Error('API Error'))

      render(<EventLeaderboard {...algoTimeProps} />)

      await waitFor(() =>
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument()
      )
    })
  })

  // ─── Empty state ──────────────────────────────────────────────────────────

  describe('Empty state', () => {
    it('shows "no leaderboard data" when participants list is empty', async () => {
      mockedGetCompetitionLive.mockResolvedValue({
        competitionName: '',
        participants: [],
        showSeparator: false,
      })

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() =>
        expect(screen.getByText(/no leaderboard data yet/i)).toBeInTheDocument()
      )
    })
  })

  // ─── Competition leaderboard ──────────────────────────────────────────────

  describe('Competition leaderboard', () => {
    it('calls getCompetitionLiveLeaderboard with the eventId and currentUserId', async () => {
      mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() => expect(mockedGetCompetitionLive).toHaveBeenCalledWith(42, 1))
      expect(mockedGetCurrentAlgoTime).not.toHaveBeenCalled()
    })

    it('displays the eventName as the leaderboard title', async () => {
      mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() =>
        expect(screen.getByText('Winter Contest')).toBeInTheDocument()
      )
    })

    it('renders the ScoreboardDataTable with participants', async () => {
      mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('scoreboard-table')).toBeInTheDocument()
        expect(screen.getByTestId('row-1')).toHaveTextContent('Alice')
        expect(screen.getByTestId('row-2')).toHaveTextContent('Bob')
      })
    })

    it('does not render a separator when showSeparator is false', async () => {
      mockedGetCompetitionLive.mockResolvedValue({ ...mockStandingsCompetition, showSeparator: false })

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() => expect(screen.getByTestId('scoreboard-table')).toBeInTheDocument())
      expect(screen.queryByTestId('separator')).not.toBeInTheDocument()
    })

    it('renders a separator when showSeparator is true', async () => {
      mockedGetCompetitionLive.mockResolvedValue({ ...mockStandingsCompetition, showSeparator: true })

      render(<EventLeaderboard {...competitionProps} />)

      await waitFor(() => expect(screen.getByTestId('separator')).toBeInTheDocument())
    })
  })

  // ─── AlgoTime leaderboard ─────────────────────────────────────────────────

  describe('AlgoTime leaderboard', () => {
    it('calls getCurrentAlgoTimeLeaderboard with currentUserId', async () => {
      mockedGetCurrentAlgoTime.mockResolvedValue(mockStandingsAlgoTime)

      render(<EventLeaderboard {...algoTimeProps} />)

      await waitFor(() => expect(mockedGetCurrentAlgoTime).toHaveBeenCalledWith(1))
      expect(mockedGetCompetitionLive).not.toHaveBeenCalled()
    })

    it('renders participants returned by the algotime endpoint', async () => {
      mockedGetCurrentAlgoTime.mockResolvedValue(mockStandingsAlgoTime)

      render(<EventLeaderboard {...algoTimeProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('row-1')).toHaveTextContent('Alice')
        expect(screen.getByTestId('row-2')).toHaveTextContent('Bob')
      })
    })

    it('passes showSeparator=true to ScoreboardDataTable', async () => {
      mockedGetCurrentAlgoTime.mockResolvedValue(mockStandingsAlgoTime)

      render(<EventLeaderboard {...algoTimeProps} />)

      await waitFor(() => expect(screen.getByTestId('separator')).toBeInTheDocument())
    })
  })

  // ─── Auto-refresh ─────────────────────────────────────────────────────────

  describe('Auto-refresh', () => {
    it('does not show a loading spinner on background refreshes', async () => {
      jest.useFakeTimers()
      mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)

      render(<EventLeaderboard {...competitionProps} />)

      // Initial fetch completes
      await waitFor(() => expect(screen.getByTestId('scoreboard-table')).toBeInTheDocument())

      // Advance clock to trigger the 60s interval
      act(() => { jest.advanceTimersByTime(60_000) })

      // Loading spinner must NOT appear on the background refresh
      expect(screen.queryByText(/loading leaderboard/i)).not.toBeInTheDocument()
      // Table must remain visible
      expect(screen.getByTestId('scoreboard-table')).toBeInTheDocument()
    })

    it('re-fetches data after 60 seconds', async () => {
      jest.useFakeTimers()
      const updatedParticipants = [
        ...mockParticipants,
        { name: 'Eve', user_id: 3, total_score: 50, problems_solved: 2, rank: 3, total_time: '00:30:00' },
      ]
      mockedGetCompetitionLive
        .mockResolvedValueOnce(mockStandingsCompetition)
        .mockResolvedValueOnce({ ...mockStandingsCompetition, participants: updatedParticipants })

      render(<EventLeaderboard {...competitionProps} />)
      await waitFor(() => expect(screen.getByTestId('row-1')).toBeInTheDocument())

      act(() => { jest.advanceTimersByTime(60_000) })

      await waitFor(() => expect(mockedGetCompetitionLive).toHaveBeenCalledTimes(2))
    })

    it('clears the interval when the component unmounts', async () => {
      jest.useFakeTimers()
      mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval')

      const { unmount } = render(<EventLeaderboard {...competitionProps} />)
      await waitFor(() => expect(screen.getByTestId('scoreboard-table')).toBeInTheDocument())

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })

  // ─── "Refreshes every minute" label ───────────────────────────────────────

  it('shows the "Refreshes every minute" label when data is loaded', async () => {
    mockedGetCompetitionLive.mockResolvedValue(mockStandingsCompetition)

    render(<EventLeaderboard {...competitionProps} />)

    await waitFor(() =>
      expect(screen.getByText(/refreshes every minute/i)).toBeInTheDocument()
    )
  })
})