describe('Sidebar Navigation', () => {
  it('loads the user and navigates through links', () => {
    // 1. Mock the API call (The sidebar needs this to populate data)
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        role: 'admin'
      }
    }).as('loadUser');

    // 2. A Mock Token that actually contains { "role": "admin" }
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

    // 6. Navigate
    cy.contains('Leaderboards').click();
    cy.wait(2000)
    cy.location('pathname').should('include', '/leaderboards');
    cy.contains('Settings').click();
    cy.wait(2000)
    cy.contains('Competition').click();
    cy.wait(2000)
    cy.contains('AlgoTime').click();
    cy.wait(2000)
    cy.contains('Dashboard').click();
  });
});