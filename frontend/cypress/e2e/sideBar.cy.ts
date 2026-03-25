describe('Sidebar Navigation', () => {
  it('loads the user and navigates through links', () => {
    // 1. Mock the API call — use 'accountType' to match what AppSidebar.tsx reads
    //    from UserContext (user.accountType), NOT 'role'
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        accountType: 'admin'   // ← was 'role', must be 'accountType' to match AppSidebar check
      }
    }).as('loadUser');

    // 2. A Mock Token that contains { "role": "admin" }
    // Decoded payload: { "sub": "123", "name": "Test User", "role": "admin" }
    const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6ImFkbWluIn0.ZnFr";

    // 3. Visit the page with the ADMIN token
    cy.visit('http://localhost:5173/app/home', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', ADMIN_TOKEN);
      }
    });

    // 4. Verification: Ensure we stayed on Home and didn't go to /unauthorized
    cy.location('pathname').should('include', '/app/home');

    // 5. Wait for the Sidebar to fetch data
    cy.wait('@loadUser');

    // 6. Navigate — use cy.contains().should('be.visible') instead of cy.wait()
    //    so the test waits for the element rather than a hardcoded time
    cy.contains('Leaderboards').should('be.visible').click();
    cy.location('pathname').should('include', '/leaderboards');

    cy.contains('Dashboard').should('be.visible').click();
    cy.location('pathname').should('include', '/dashboard');

    cy.visit('http://localhost:5173/app/home', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', ADMIN_TOKEN);
      }
    });

    // Re-wait for profile after revisit so UserContext is populated before clicking
    cy.wait('@loadUser');

    cy.contains('Competitions').should('be.visible').click();
    cy.location('pathname').should('include', '/competitions');
  });
});