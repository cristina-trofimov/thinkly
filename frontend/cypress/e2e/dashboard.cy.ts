describe('Admin Dashboard', () => {
  beforeEach(() => {
    // Set up API intercepts BEFORE visiting the page
    // Intercept auth profile check
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        role: 'admin',
      },
    }).as('getProfile');

    // Intercept API calls to prevent real network requests
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

    // Set token in localStorage before page loads
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9.mock';
    cy.visit('/app/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });
  });

  it('renders the main dashboard overview', () => {
    // Check for the header
    cy.get('h1').contains('Overview').should('be.visible');

    // Check that the default tab is active
    cy.contains('button', 'Algotime').should('have.attr', 'data-state', 'active');

    // Check that the default time range is displayed
    cy.contains('Last 3 months').should('be.visible');
  });

  it('updates stats when the Time Range filter is changed', () => {
    // 1. Wait for initial data to load - check that New Accounts card is visible
    cy.contains('New Accounts').should('be.visible');

    // 2. Open the Select dropdown using the trigger button
    cy.get('[data-testid="time-range-select"], [role="combobox"]').first().click({ force: true });

    // 3. Click the "Last 7 days" option
    // shadcn/ui Select renders options with role="option" in a portal
    cy.get('[role="listbox"]').should('be.visible');
    cy.get('[role="option"]').contains('Last 7 days').click({ force: true });

    // 4. Verify the time range changed
    cy.get('[role="combobox"]').first().should('contain.text', 'Last 7 days');
  });

  it('contains correct navigation links for management cards', () => {
    // Verify "Manage Accounts" link
    cy.contains('a', 'Manage Accounts')
      .should('have.attr', 'href', '/app/dashboard/manageAccounts');

    // Verify "Manage Competitions" link
    cy.contains('a', 'Manage Competitions')
      .should('have.attr', 'href', '/app/dashboard/competitions');

    // Verify "Manage Algotime Sessions" link
    cy.contains('a', 'Manage Algotime Sessions')
      .should('have.attr', 'href', '/app/dashboard/algoTimeSessions');
  });

  it('switches tabs correctly', () => {
    // Wait for initial load to complete
    cy.contains('New Accounts').should('be.visible');

    // Click the Competitions tab using role="tab"
    cy.get('[role="tab"]').contains('Competitions').click({ force: true });

    // Verify it is now the active tab
    cy.get('[role="tab"]').contains('Competitions').should('have.attr', 'data-state', 'active');
    cy.get('[role="tab"]').contains('Algotime').should('have.attr', 'data-state', 'inactive');
  });
});