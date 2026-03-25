describe('Sidebar Navigation', () => {
  it('loads the user and navigates through links', () => {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        accountType: 'Admin', // match what UserContext actually expects
      },
    }).as('loadUser');

    // Token with a far-future exp so auth guards don't reject it
    const ADMIN_TOKEN =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      btoa(JSON.stringify({ sub: '1', role: 'admin', exp: 9999999999 })) +
      '.mock';

    cy.visit('http://localhost:5173/app/home', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('token', ADMIN_TOKEN);
      },
    });

    cy.wait('@loadUser');

    // wait for the Sidebar to reflect the Admin state.
    cy.contains('Thinkly').should('be.visible');

    // Increase timeout specifically for this check to account for context updates
    cy.contains('Dashboard', { timeout: 10000 }).should('exist').and('be.visible');

    cy.contains('Leaderboards').click();
    cy.location('pathname').should('include', '/leaderboards');

    cy.contains('Dashboard').click();
    cy.location('pathname').should('include', '/app/dashboard');

    cy.contains('Competition').click();
    cy.location('pathname').should('include', '/competition');
  });
});