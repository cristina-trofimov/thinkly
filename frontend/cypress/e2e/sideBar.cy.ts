describe('Sidebar Navigation', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9' +
    '.mock';

  // getProfile() maps data.role → accountType. Must use "role" here.
  const adminProfileResponse = {
    id: 1,
    firstName: 'Test',
    lastName: 'Admin',
    email: 'admin@test.com',
    role: 'Admin',
  };

  function setupIntercepts(profileResponse: object) {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: profileResponse,
    }).as('getProfile');

    cy.intercept('POST', '**/logger**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/log**', { statusCode: 200, body: {} });
    cy.intercept('GET', '**/auth/preferences**', { statusCode: 200, body: { theme: 'light', notifications_enabled: true } });
    cy.intercept('POST', '**/analytics**', { statusCode: 200, body: {} });
    cy.intercept('GET', '**/analytics**', { statusCode: 200, body: {} });
  }

  function visitHome() {
    cy.viewport(1440, 900);
    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
        win.localStorage.setItem('sidebar:state', 'expanded');
      },
    });
    // Wait for profile to resolve so UserContext finishes setting state.
    cy.wait('@getProfile');
    // Then wait for the Dashboard link to be visible — this confirms the
    // sidebar has fully re-rendered after setUser() and is stable before
    // any test starts interacting with it.
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
  }

  beforeEach(() => {
    setupIntercepts(adminProfileResponse);
    visitHome();
  });

  it('loads the user and navigates through links', () => {
    // Re-query each element immediately before clicking rather than chaining
    // off a previous query — this avoids acting on a stale reference from
    // before the last React re-render.
    cy.contains('Leaderboards').should('be.visible').click();
    cy.location('pathname').should('include', 'leaderboards');

    cy.contains('Dashboard').should('be.visible').click();
    cy.location('pathname').should('include', '/app/dashboard');
  });

  it('shows AlgoTime and Competitions links for all users', () => {
    cy.contains('AlgoTime').should('be.visible');
    cy.contains('Competitions').should('be.visible');
  });

  it('shows Leaderboards link for all users', () => {
    cy.contains('Leaderboards').should('be.visible');
  });

  it('shows Dashboard link only for admin/owner users', () => {
    cy.contains('Dashboard').should('be.visible');
  });

  it('hides Dashboard link for participant users', () => {
    setupIntercepts({
      id: 2,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@test.com',
      role: 'Participant',
    });

    cy.viewport(1440, 900);
    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
        win.localStorage.setItem('sidebar:state', 'expanded');
      },
    });
    cy.wait('@getProfile');
    // Wait for a link that should always appear, confirming the sidebar is
    // stable before asserting Dashboard is absent.
    cy.contains('AlgoTime', { timeout: 8000 }).should('be.visible');
    cy.contains('Dashboard').should('not.exist');
  });
});