import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useLocation, useOutlet } from 'react-router-dom';

// Using relative paths consistently to resolve resolution errors
import ManageCompetitions from '../src/views/admin/ManageCompetitionsPage';
import { getCompetitions } from '../src/api/CompetitionAPI';
import { type Competition } from '../src/types/competition/Competition.type';

// FIX: Define mock hooks outside the describe block
const mockNavigate = jest.fn();
const mockLocation = { key: 'test-key', state: null };
jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
// Mocking react-router-dom to provide context for useNavigate, useLocation and useOutlet
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useOutlet: () => null, // Return null so the main component view renders
}));

jest.mock('../src/config', () => ({
  getBackendUrl: () => 'http://localhost:5173',
}));

// Fixed mocks to use relative paths matching the project structure
jest.mock('../src/api/CompetitionAPI');
jest.mock('../src/api/LoggerAPI', () => ({
  logFrontend: jest.fn(),
}));

const mockedGetCompetitions = getCompetitions as jest.MockedFunction<typeof getCompetitions>;

describe('ManageCompetitions', () => {
  const competitions: Competition[] = [
    {
      id: 1,
      competitionTitle: 'Math Contest',
      competitionLocation: 'Toronto',
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 2 * 86400000),
    },
    {
      id: 2,
      competitionTitle: 'Science Fair',
      competitionLocation: 'Montreal',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    },
    {
      id: 3,
      competitionTitle: 'History Quiz',
      competitionLocation: 'Vancouver',
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCompetitions.mockResolvedValue(competitions);
  });

  it('renders competitions after loading', async () => {
    render(<ManageCompetitions />);

    // Wait for competitions to load and verify titles appear
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

  it('navigates to the create competition page when the create card is clicked', async () => {
    render(<ManageCompetitions />);

    // Wait for the "Create New Competition" card to be visible
    await waitFor(() => screen.getByText(/Create New Competition/i));

    // Simulate click on the "Create New Competition" card
    // We target the closest container to ensure the click triggers the navigate logic
    const createCard = screen.getByText(/Create New Competition/i).closest('div[data-slot="card"]');
    if (!createCard) {
      // Fallback to finding by card text if the data-slot isn't present in the test env
      const fallbackCard = screen.getByText(/Create New Competition/i).parentElement;
      if (fallbackCard) fireEvent.click(fallbackCard);
    } else {
      fireEvent.click(createCard);
    }

    // Verify that navigate was called with the relative path "createCompetition"
    // matching the new routing logic (dialog removal)
    expect(mockNavigate).toHaveBeenCalledWith("createCompetition");
  });
});
