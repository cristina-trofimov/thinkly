describe('Sidebar Navigation', () => {
  it('loads the user and navigates through links', () => {
    // 1. Mock the API call
    // Use a broad pattern to match regardless of what base URL axiosClient uses
    cy.intercept('GET', /\/auth\/profile/, {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        role: 'admin'   // getProfile() in AuthAPI.tsx maps data.role → accountType
      }
    }).as('loadUser');

    // Also intercept preferences so NavUser doesn't throw
    cy.intercept('GET', /\/manage-accounts\/users\/.*\/preferences/, {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true }
    }).as('loadPrefs');

    // 2. Mock Token: { "sub": "123", "name": "Test User", "role": "admin" }
    const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6ImFkbWluIn0.ZnFr";

    // 3. Visit with token already in localStorage
    cy.visit('http://localhost:5173/app/home', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', ADMIN_TOKEN);
      }
    });

    // 4. Wait for the profile request to complete before asserting anything
    cy.wait('@loadUser');

    // 5. Verify we are on home and not redirected to /unauthorized
    cy.location('pathname').should('include', '/app/home');

    // 6. Dashboard should now be visible since user is admin
    cy.contains('Dashboard').should('be.visible');

    // 7. Navigate
    cy.contains('Leaderboards').should('be.visible').click();
    cy.location('pathname').should('include', '/leaderboards');

    cy.contains('Dashboard').should('be.visible').click();
    cy.location('pathname').should('include', '/dashboard');

    cy.visit('http://localhost:5173/app/home', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', ADMIN_TOKEN);
      }
    });

    cy.wait('@loadUser');

    cy.contains('Competitions').should('be.visible').click();
    cy.location('pathname').should('include', '/competitions');
  });
});