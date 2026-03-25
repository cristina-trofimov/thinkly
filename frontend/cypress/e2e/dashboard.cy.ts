describe('Admin Dashboard', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9' +
    '.mock';

  beforeEach(() => {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        accountType: 'Admin',
      },
    }).as('getProfile');

    cy.intercept('GET', '**/admin/dashboard/overview', {
      statusCode: 200,
      body: {
        recent_accounts: [
          { name: 'John Doe', info: 'john@example.com', avatarUrl: null },
          { name: 'Jane Smith', info: 'jane@example.com', avatarUrl: null },
        ],
        recent_competitions: [
          { name: 'Competition 1', info: '01/01/26', color: 'var(--color-chart-1)' },
        ],
        recent_questions: [
          { name: 'Question 1', info: 'Date added: 01/01/26' },
        ],
        recent_algotime_sessions: [
          { name: 'Session 1', info: 'Date added: 01/01/26' },
        ],
      },
    }).as('getOverview');

    cy.intercept('GET', '**/admin/dashboard/stats/new-accounts*', {
      statusCode: 200,
      body: { value: 25, subtitle: 'Up 10% in the last 3 months', trend: '+10%', description: 'More users joining' },
    }).as('getNewAccounts');

    cy.intercept('GET', '**/admin/dashboard/stats/questions-solved*', {
      statusCode: 200,
      body: [
        { name: 'Easy', value: 10, color: 'var(--chart-1)' },
        { name: 'Medium', value: 20, color: 'var(--chart-2)' },
        { name: 'Hard', value: 5, color: 'var(--chart-3)' },
      ],
    }).as('getQuestionsSolved');

    cy.intercept('GET', '**/admin/dashboard/stats/time-to-solve*', {
      statusCode: 200,
      body: [
        { type: 'Easy', time: 5, color: 'var(--chart-1)' },
        { type: 'Medium', time: 15, color: 'var(--chart-2)' },
        { type: 'Hard', time: 30, color: 'var(--chart-3)' },
      ],
    }).as('getTimeToSolve');

    cy.intercept('GET', '**/admin/dashboard/stats/logins*', {
      statusCode: 200,
      body: [
        { month: 'Jan', logins: 100 },
        { month: 'Feb', logins: 150 },
      ],
    }).as('getLogins');

    cy.intercept('GET', '**/admin/dashboard/stats/participation*', {
      statusCode: 200,
      body: [
        { date: 'Mon', participation: 50 },
        { date: 'Tue', participation: 75 },
      ],
    }).as('getParticipation');

    cy.visit('/app/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    cy.wait('@getProfile');
  });

  it('renders the main dashboard overview', () => {
    cy.get('h1').contains('Overview').should('be.visible');

    // Radix TabsTrigger renders as role="tab"
    cy.get('[role="tab"]').contains('Algotime').should('have.attr', 'data-state', 'active');

    cy.contains('Last 3 months').should('be.visible');
  });

  it('updates stats when the Time Range filter is changed', () => {
    cy.contains('New Accounts').should('be.visible');

    // Open the Radix Select by clicking its trigger
    cy.get('[role="combobox"]').click();

    // The listbox renders in a portal — use cy.get on the listbox directly
    cy.get('[role="listbox"]').contains('Last 7 days').click();

    // The trigger should now display the selected value
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

    // Tabs render as role="tab", not button
    cy.get('[role="tab"]').contains('Competitions').click({ force: true });

    cy.get('[role="tab"]').contains('Competitions')
      .should('have.attr', 'data-state', 'active');
    cy.get('[role="tab"]').contains('Algotime')
      .should('have.attr', 'data-state', 'inactive');
  });
});