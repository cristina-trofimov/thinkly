describe('Leaderboards Page', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6InBhcnRpY2lwYW50IiwiZXhwIjo5OTk5OTk5OTk5fQ' +
    '.mock';

  const participantProfileResponse = {
    id: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@test.com',
    role: 'Participant',
  };

  function setupIntercepts() {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: participantProfileResponse,
    }).as('getProfile');

    cy.intercept('GET', '**/auth/preferences**', {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true },
    });

    cy.intercept('POST', '**/logger**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/log**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/analytics**', { statusCode: 200, body: {} });
    cy.intercept('GET', '**/analytics**', { statusCode: 200, body: {} });

    cy.intercept('GET', /\/algotime/, {
      statusCode: 200,
      body: {
        total: 2,
        page: 1,
        pageSize: 20,
        participants: [
          { user_id: 1, name: 'Alice', total_score: 100, problems_solved: 5, total_time: 3000 },
          { user_id: 2, name: 'Bob', total_score: 80, problems_solved: 4, total_time: 2500 },
        ],
      },
    }).as('getAlgotime');

    cy.intercept('GET', /\/leaderboard\/current/, {
      statusCode: 200,
      body: { competitionName: 'No Active Competition', participants: [], showSeparator: false },
    }).as('getCurrentCompetition');

    cy.intercept('GET', /\/leaderboard\/competitions/, {
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

    cy.intercept('GET', /\/leaderboard/, { statusCode: 200, body: {} });
    cy.intercept('GET', /\/sessions/, { statusCode: 200, body: { total: 0, items: [] } });
  }

  beforeEach(() => {
    setupIntercepts();

    cy.viewport(1440, 900);
    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
        win.localStorage.setItem('sidebar:state', 'expanded');
      },
    });

    cy.wait('@getProfile');

    // Navigate client-side via sidebar — avoids Vite returning a JSON 404
    // for direct visits to /app/leaderboards
    cy.contains('Leaderboards', { timeout: 10000 }).should('be.visible').click();
    cy.location('pathname').should('include', 'leaderboards');
  });

  it('loads the leaderboards successfully', () => {
    cy.get('[data-cy="leaderboard-algotime"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy="leaderboard-competitions"]').should('be.visible');
  });

  it('defaults to the AlgoTime tab', () => {
    cy.get('[data-cy="leaderboard-algotime"]', { timeout: 10000 })
      .should('have.attr', 'data-state', 'active');
    cy.get('[data-cy="leaderboard-competitions"]')
      .should('have.attr', 'data-state', 'inactive');
  });

  it('switches to the Competitions tab', () => {
    cy.get('[data-cy="leaderboard-competitions"]', { timeout: 10000 }).click();
    cy.get('[data-cy="leaderboard-competitions"]').should('have.attr', 'data-state', 'active');
    cy.get('[data-cy="leaderboard-algotime"]').should('have.attr', 'data-state', 'inactive');
  });

  it('shows empty state when no competitions match search', () => {
    cy.intercept('GET', /\/leaderboard\/competitions/, {
      statusCode: 200,
      body: { total: 0, competitions: [] },
    }).as('emptyCompetitions');
    cy.intercept('GET', /\/leaderboard\/current/, {
      statusCode: 200,
      body: { competitionName: 'No Active Competition', participants: [], showSeparator: false },
    });

    cy.get('[data-cy="leaderboard-competitions"]', { timeout: 10000 }).click();

    cy.get('input[type="search"], input[placeholder*="earch"]', { timeout: 8000 })
      .first()
      .clear()
      .type('zzznomatch');

    cy.contains('No competitions', { timeout: 10000 }).should('be.visible');
  });
});