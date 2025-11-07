describe('Basic E2E Test', () => {
  it('Visits the home page and checks title', () => {
    cy.visit('http://localhost:5173/home');
    cy.contains('Leaderboards').click();
    cy.wait(2000)
    cy.contains('Dashboard').click();
    cy.wait(2000)
    cy.contains('Settings').click();
    cy.wait(2000)
    cy.contains('Competition').click();
    cy.wait(2000)
    cy.contains('AlgoTime').click();
  });
});