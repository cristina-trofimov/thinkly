describe('Check leaderboards page', () => {
  beforeEach(() => {
    // Inject config into window before the page loads
    Cypress.on('window:before:load', (win) => {
      win.config = { backendUrl: Cypress.env('BACKEND_URL') || 'http://localhost:8000' };
    });

    // Intercept backend call
    cy.intercept('GET', `${Cypress.env('BACKEND_URL')}/standings/leaderboards`, {
      statusCode: 200,
      body: [
        {
          competition_id: 1,
          name: "Competition 1",
          location: "Online",
          date: "2025-08-01T00:00:00Z",
          start_time: "2025-08-01T00:00:00Z",
          end_time: "2025-08-01T00:00:00Z",
          cooldown_time: 30,
          participants: [
            { username: "user1", name: "John Doe", total_score: 1500, problems_solved: 10},
            { username: "user2", name: "Jane Doe", total_score: 1200, problems_solved: 8},
          ],
        },
      ],
    }).as('getCompetitions');
  });

  it('Visits the leaderboards page and filter for different leaderboards', () => {
    cy.visit('http://localhost:5173/app/leaderboards');
    cy.contains("Competition 1").should('be.visible');
    cy.contains('Competition 1').click();
    cy.contains("John Doe").should('be.visible');
    cy.contains('Competition 1').click();
    cy.contains('Date: Newest → Oldest').should('be.visible').click();
    cy.contains('Sort by Date', { timeout: 5000 }).should('be.visible');
    cy.contains('Oldest → Newest').should('be.visible').click();
    cy.contains('Sort by Date', { timeout: 5000 }).should('be.visible');
    cy.contains('Newest → Oldest').should('be.visible').click();
    cy.contains('Competition 1').click();
  });
});
