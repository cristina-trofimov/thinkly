describe('Admin Dashboard', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9' +
    '.mock';

  // getProfile() maps data.role → accountType
  const adminProfileResponse = {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    role: 'Admin',
  };

  function setupIntercepts() {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: adminProfileResponse,
    }).as('getProfile');

    cy.intercept('GET', '**/auth/preferences**', {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true },
    });

    cy.intercept('POST', '**/logger**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/log**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/analytics**', { statusCode: 200, body: {} });
    cy.intercept('GET', '**/analytics**', { statusCode: 200, body: {} });

    cy.intercept('GET', '**/admin/dashboard/stats/new-accounts**', {
      statusCode: 200,
      body: { value: 25, subtitle: 'Up 10% in the last 3 months', trend: '+10%', description: 'More users joining' },
    }).as('getNewAccounts');

    cy.intercept('GET', '**/admin/dashboard/stats/questions-solved**', {
      statusCode: 200,
      body: [
        { name: 'Easy', value: 10, color: 'var(--chart-1)' },
        { name: 'Medium', value: 20, color: 'var(--chart-2)' },
        { name: 'Hard', value: 5, color: 'var(--chart-3)' },
      ],
    }).as('getQuestionsSolved');

    cy.intercept('GET', '**/admin/dashboard/stats/time-to-solve**', {
      statusCode: 200,
      body: [
        { type: 'Easy', time: 5 },
        { type: 'Medium', time: 15 },
        { type: 'Hard', time: 30 },
      ],
    }).as('getTimeToSolve');

    cy.intercept('GET', '**/admin/dashboard/stats/logins**', {
      statusCode: 200,
      body: [{ month: 'Jan', logins: 100 }, { month: 'Feb', logins: 150 }],
    }).as('getLogins');

    cy.intercept('GET', '**/admin/dashboard/stats/participation**', {
      statusCode: 200,
      body: [{ date: 'Mon', participation: 50 }, { date: 'Tue', participation: 75 }],
    }).as('getParticipation');
  }

  beforeEach(() => {
    setupIntercepts();

    // /app/home is the safe HTML entry point — Vite serves index.html for it.
    // Direct visits to /app/dashboard fail because Vite has no file there and
    // returns a JSON 404 instead of index.html. ProtectedRoute is client-side
    // only, so once React is mounted we can navigate freely.
    cy.viewport(1440, 900);
    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
        win.localStorage.setItem('sidebar:state', 'expanded');
      },
    });

    cy.wait('@getProfile');

    // Navigate client-side via the sidebar — no Vite 404 risk
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible').click();
    cy.location('pathname').should('match', /\/app\/dashboard\/?$/);

    cy.wait('@getNewAccounts');
  });

  it('renders the main dashboard overview', () => {
    cy.contains('New Accounts').should('be.visible');
    cy.contains('Overview').should('be.visible');
    cy.get('[role="tab"]').contains('Algotime').should('have.attr', 'data-state', 'active');
    cy.contains('Last 3 months').should('be.visible');
  });

  it('updates stats when the Time Range filter is changed', () => {
    cy.contains('New Accounts').should('be.visible');
    cy.get('[role="combobox"]').click();
    cy.get('[role="listbox"]').contains('Last 7 days').click();
    cy.get('[role="combobox"]').should('contain.text', 'Last 7 days');
  });

  it('contains correct navigation links for management cards', () => {
    cy.contains('a', 'Manage Accounts')
      .should('have.attr', 'href', '/app/dashboard/manageAccounts');
    cy.contains('a', 'Manage Competitions')
      .should('have.attr', 'href', '/app/dashboard/competitions');
    cy.contains('a', 'Manage Algotime Sessions')
      .should('have.attr', 'href', '/app/dashboard/algoTimeSessions');
  });

  it('switches tabs correctly', () => {
    cy.contains('New Accounts').should('be.visible');
    cy.get('[role="tab"]').contains('Competitions').click({ force: true });
    cy.get('[role="tab"]').contains('Competitions').should('have.attr', 'data-state', 'active');
    cy.get('[role="tab"]').contains('Algotime').should('have.attr', 'data-state', 'inactive');
  });
});