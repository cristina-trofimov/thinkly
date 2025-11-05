describe('Check leaderboards page', () => {
     beforeEach(() => {
    // Intercept backend call
    cy.intercept('GET', 'http://localhost:8000/api/competitions', {
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
            { username: "user1", score: 1500, rank: 1 },
            { username: "user2", score: 1300, rank: 2 },
          ],
        },
      ],
    }).as('getCompetitions');
  });

  it('Visits the leaderboards page and filter for different leaderboards', () => {
    cy.visit('http://localhost:5173/leaderboards');
    cy.contains("Competition 1").should('be.visible');
    cy.contains('Competition 1').click();
    cy.contains('Competition 1').click();
    cy.contains('Date: Newest → Oldest').should('be.visible').click();
    cy.contains('Sort by Date', { timeout: 5000 }).should('be.visible');
    cy.contains('Oldest → Newest').should('be.visible').click();
   //cy.contains('Date: Oldest → Newest').should('be.visible').click();
    cy.contains('Sort by Date', { timeout: 5000 }).should('be.visible');
    cy.contains('Newest → Oldest').should('be.visible').click();
    cy.contains('Competition 1').click();
  });
});