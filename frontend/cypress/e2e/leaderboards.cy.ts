describe('Leaderboards Page', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6InBhcnRpY2lwYW50IiwiZXhwIjo5OTk5OTk5OTk5fQ' +
    '.mock';

  beforeEach(() => {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        accountType: 'Participant',
      },
    }).as('getProfile');

    cy.intercept('GET', '**/auth/preferences*', {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true },
    }).as('getPreferences');

    // AlgoTimeCard manages its own data fetching internally.
    // Intercept whatever endpoint it calls so it doesn't hang or error.
    // Use a broad catch-all for algotime-related endpoints.
    cy.intercept('GET', '**/algotime*', {
      statusCode: 200,
      body: {
        total: 2,
        participants: [
          { user_id: 1, name: 'Alice', total_score: 100, problems_solved: 5, total_time: 3000 },
          { user_id: 2, name: 'Bob', total_score: 80, problems_solved: 4, total_time: 2500 },
        ],
      },
    }).as('getAlgotime');

    // Competitions leaderboard list endpoint
    cy.intercept('GET', '**/leaderboard/competitions*', {
      statusCode: 200,
      body: {
        total: 1,
        competitions: [
          {
            id: 101,
            competitionTitle: 'Summer Hackathon',
            date: new Date().toISOString(),
            participants: [
              { user_id: 1, name: 'Alice', total_score: 50, problems_solved: 2, total_time: 1000 },
            ],
          },
        ],
      },
    }).as('getCompetitions');

    // Current competition leaderboard (used by Leaderboards.tsx via
    // getCurrentCompetitionLeaderboard — returns no active competition so the
    // "Current Competition" banner is suppressed)
    cy.intercept('GET', '**/leaderboard/current*', {
      statusCode: 200,
      body: {
        competitionName: 'No Active Competition',
        participants: [],
        showSeparator: false,
      },
    }).as('getCurrentCompetition');

    // Paginated competitions details endpoint used by getCompetitionsDetails()
    cy.intercept('GET', '**/competitions/details*', {
      statusCode: 200,
      body: {
        total: 0,
        competitions: [],
      },
    }).as('getCompetitionsDetails');

    cy.visit('/app/leaderboards', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    cy.wait('@getProfile');
  });

  it('loads the leaderboards successfully', () => {
    // The AlgoTime tab trigger should be visible and active by default
    cy.get('[data-cy="leaderboard-algotime"]', { timeout: 6000 }).should('be.visible');
    cy.get('[data-cy="leaderboard-competitions"]').should('be.visible');
  });

  it('defaults to the AlgoTime tab', () => {
    cy.get('[data-cy="leaderboard-algotime"]', { timeout: 6000 })
      .should('have.attr', 'data-state', 'active');
    cy.get('[data-cy="leaderboard-competitions"]')
      .should('have.attr', 'data-state', 'inactive');
  });

  it('switches to the Competitions tab', () => {
    cy.get('[data-cy="leaderboard-competitions"]', { timeout: 6000 }).click();
    cy.get('[data-cy="leaderboard-competitions"]')
      .should('have.attr', 'data-state', 'active');
    cy.get('[data-cy="leaderboard-algotime"]')
      .should('have.attr', 'data-state', 'inactive');
  });

  it('shows empty state when no competitions match search', () => {
    // Switch to competitions tab first
    cy.get('[data-cy="leaderboard-competitions"]', { timeout: 6000 }).click();

    // Re-intercept with empty results to simulate a search returning nothing
    cy.intercept('GET', '**/leaderboard/competitions*', {
      statusCode: 200,
      body: { total: 0, competitions: [] },
    }).as('emptySearch');

    cy.intercept('GET', '**/competitions/details*', {
      statusCode: 200,
      body: { total: 0, competitions: [] },
    }).as('emptyDetails');

    // Type in the search box that SearchAndFilterBar renders
    cy.get('input[type="search"], input[placeholder*="earch"]', { timeout: 6000 })
      .first()
      .type('zzznomatch');

    cy.contains('No competitions', { timeout: 8000 }).should('be.visible');
  });
});