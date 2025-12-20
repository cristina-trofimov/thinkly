jest.mock('../src/config', () => ({
  getBackendUrl: () => 'http://localhost:5173',
  // Add any other exports from config.ts here
}));



import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageCompetitions from '../src/views/admin/ManageCompetitionsPage';
import { getCompetitions } from '../src/api/CompetitionAPI';
import { Competition } from '../src/types/competition/Competition.type';

jest.mock('@/api/CompetitionAPI');
jest.mock('@/api/LoggerAPI');

const mockedGetCompetitions = getCompetitions as jest.MockedFunction<typeof getCompetitions>;

describe('ManageCompetitions', () => {
  const competitions: Competition[] = [
    {
      id: '1',
      competitionTitle: 'Math Contest',
      competitionLocation: 'Toronto',
      date: new Date(Date.now() + 86400000), // Tomorrow -> Upcoming
    },
    {
      id: '2',
      competitionTitle: 'Science Fair',
      competitionLocation: 'Montreal',
      date: new Date(), // Today -> Active
    },
    {
      id: '3',
      competitionTitle: 'History Quiz',
      competitionLocation: 'Vancouver',
      date: new Date(Date.now() - 86400000), // Yesterday -> Completed
    },
  ];

  beforeEach(() => {
    mockedGetCompetitions.mockResolvedValue(competitions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders competitions after loading', async () => {
    render(<ManageCompetitions />);

    // Wait for competitions to load
    await waitFor(() => {
      expect(screen.getByText(/Math Contest/i)).toBeInTheDocument();
      expect(screen.getByText(/Science Fair/i)).toBeInTheDocument();
      expect(screen.getByText(/History Quiz/i)).toBeInTheDocument();
    });
  });


  it('filters competitions by search query', async () => {
    render(<ManageCompetitions />);

    await waitFor(() => screen.getByText(/Math Contest/i));

    const searchInput = screen.getByPlaceholderText(/Search competitions/i);
    fireEvent.change(searchInput, { target: { value: 'Science' } });

    expect(screen.getByText(/Science Fair/i)).toBeInTheDocument();
    expect(screen.queryByText(/Math Contest/i)).not.toBeInTheDocument();
  });

  it('opens create competition dialog', async () => {
    render(<ManageCompetitions />);

    await waitFor(() => screen.getByText(/Create New Competition/i));

    fireEvent.click(screen.getByText(/Create New Competition/i));

    expect(screen.getByText(/Create Competition/i)).toBeInTheDocument(); // Adjust text if your dialog has a heading
  });
});
