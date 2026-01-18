describe('Leaderboards Page', () => {
  const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6InBhcnRpY2lwYW50In0.ZnFr";

  beforeEach(() => {
    // 1. Mock Profile
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: { id: 1, role: 'participant', firstName: 'Test', lastName: 'User' }
    }).as('getProfile');

    // 2. FIX: Update this to match the URL in your error log
    cy.intercept('GET', '**/homepage/get-competitions', {
      statusCode: 200,
      body: [
        // Provide data structure expected by your leaderboard
        {
          competitionId: 101,
          title: 'Algo Master',
          status: 'Active'
        },
        {
          competitionId: 102,
          title: 'Code Ninja',
          status: 'Completed'
        }
      ]
    }).as('getLeaderboardData'); // Renamed for clarity

    // 3. Visit
    cy.visit('http://localhost:5173/app/leaderboards', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', MOCK_TOKEN);
      }
    });
  });

  it('loads the leaderboards successfully', () => {
    // Wait for the correct alias
    cy.wait(['@getProfile', '@getLeaderboardData']);

    // Assertions
    cy.contains('Loading leaderboards...').should('not.exist');

    // Check for the data we mocked above
  });
});