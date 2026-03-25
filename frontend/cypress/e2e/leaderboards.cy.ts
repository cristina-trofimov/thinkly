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

    // AlgoTime leaderboard data (default tab)
    cy.intercept('GET', '**/leaderboard/algotime*', {
      statusCode: 200,
      body: {
        total: 2,
        participants: [
          { user_id: 1, name: 'Alice', total_score: 100, problems_solved: 5, total_time: 3000 },
          { user_id: 2, name: 'Bob', total_score: 80, problems_solved: 4, total_time: 2500 },
        ],
      },
    }).as('getAlgotime');

    // Competition leaderboards (switched to via tab)
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

    cy.intercept('GET', '**/leaderboard/current*', {
      statusCode: 200,
      body: {
        competitionName: 'No Active Competition',
        participants: [],
        showSeparator: false,
      },
    }).as('getCurrentCompetition');

    cy.visit('/app/leaderboards', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    cy.wait('@getProfile');
  });

  it('loads the leaderboards successfully', () => {
    // The AlgoTime tab should be visible and active by default
    cy.get('[data-cy="leaderboard-algotime"]', { timeout: 6000 }).should('be.visible');
    cy.get('[data-cy="leaderboard-competitions"]').should('be.visible');

    // Click the competitions tab
    cy.get('[data-cy="leaderboard-competitions"]').click();
    cy.wait('@getCompetitions');
  });

  it('defaults to the AlgoTime tab', () => {
    cy.get('[data-cy="leaderboard-algotime"]', { timeout: 6000 })
      .should('have.attr', 'data-state', 'active');
  });

  it('switches to the Competitions tab', () => {
    cy.get('[data-cy="leaderboard-competitions"]', { timeout: 6000 }).click();
    cy.get('[data-cy="leaderboard-competitions"]')
      .should('have.attr', 'data-state', 'active');
    cy.get('[data-cy="leaderboard-algotime"]')
      .should('have.attr', 'data-state', 'inactive');
  });

  it('shows empty state when no competitions match search', () => {
    cy.intercept('GET', '**/leaderboard/competitions*', {
      statusCode: 200,
      body: { total: 0, competitions: [] },
    }).as('emptySearch');

    cy.get('[data-cy="leaderboard-competitions"]', { timeout: 6000 }).click();
    cy.wait('@emptySearch');

    cy.contains('No competitions found').should('be.visible');
  });
});