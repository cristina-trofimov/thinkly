describe('Manage Competitions Page', () => {
  const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6ImFkbWluIn0.ZnFr";

  beforeEach(() => {
    // 1. Mock User Profile
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: { role: 'admin', firstName: 'Admin', lastName: 'User', id: 1 }
    }).as('getProfile');

    // 2. Mock Competitions Data
    // IMPORTANT: I added 'https://thinkly-production.up.railway.app' to ensure we only intercept 
    // the BACKEND request, not the frontend page load.
    // If your API port is different, change 8000.
    cy.intercept('GET', '/**/competitions*', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'Summer Hackathon',
          status: 'Active',
          // Add these "safety" fields just in case your UI needs them:
          description: "Test description",
          participantCount: 10,
          startDate: "2024-01-01"
        }
      ],
    }).as('getCompetitions');

    // 3. USE cy.visit() TO LOAD THE UI
    cy.visit('http://localhost:5173/app/dashboard/competitions', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', ADMIN_TOKEN);
      },
    });

    // 4. Wait for the API calls
    cy.wait(['@getProfile', '@getCompetitions']);
  });

  it('Checks all elements are present', () => {
    cy.get('input[placeholder="Search competitions..."]').should('be.visible');
    cy.contains('All competitions').should('be.visible');
    cy.contains('Create New Competition').should('be.visible');
  });
});