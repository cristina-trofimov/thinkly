describe('Sidebar Navigation', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9' +
    '.mock';

  beforeEach(() => {
    // Profile must return accountType 'Admin' or 'Owner' so the Dashboard
    // link passes the requiresAdmin filter in AppSidebar
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        accountType: 'Admin',
      },
    }).as('getProfile');

    cy.intercept('GET', '**/auth/preferences*', {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true },
    }).as('getPreferences');

    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    // Wait for profile to load so UserContext hydrates before assertions
    cy.wait('@getProfile');
  });

  it('loads the user and navigates through links', () => {
    // Dashboard link only appears for admin/owner — wait for sidebar to hydrate.
    // The sidebar reads from UserContext which resolves after @getProfile,
    // but React state updates are async so we need a generous timeout.
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // Navigate to Leaderboards
    cy.contains('Leaderboards').click();
    cy.location('pathname').should('include', 'leaderboards');

    // Navigate back to Dashboard
    cy.contains('Dashboard').click();
    cy.location('pathname').should('include', '/app/dashboard');
  });

  it('shows AlgoTime and Competitions links for all users', () => {
    cy.contains('AlgoTime', { timeout: 8000 }).should('be.visible');
    cy.contains('Competitions').should('be.visible');
  });

  it('shows Leaderboards link for all users', () => {
    cy.contains('Leaderboards', { timeout: 8000 }).should('be.visible');
  });

  it('shows Dashboard link only for admin/owner users', () => {
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
  });

  it('hides Dashboard link for participant users', () => {
    // Re-intercept profile as participant before revisiting so the UserContext
    // hydrates with the Participant role from the very first profile fetch.
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 2,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
        accountType: 'Participant',
      },
    }).as('getParticipantProfile');

    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    cy.wait('@getParticipantProfile');

    // AlgoTime should still be visible for all roles
    cy.contains('AlgoTime', { timeout: 8000 }).should('be.visible');
    // Dashboard must NOT appear for participants
    cy.contains('Dashboard').should('not.exist');
  });
});