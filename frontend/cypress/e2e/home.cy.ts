describe('Check Home page', () => {
  it('Visits the home page and filter for different questions', () => {
    cy.visit('http://localhost:5173/app/home');
    cy.contains("It's Competition Time!").should('be.visible');
    cy.contains('Filter Difficulties')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    // Test Medium filter
    cy.get('[data-testid="filter-medium"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains("Palindrome").should('be.visible');

  });
  it('is Upcomming Competitions present', () => {
    cy.visit('http://localhost:5173/app/home');
    cy.contains("Competitions on").should('be.visible');
    cy.contains("AI Coding Sprint").should('be.visible');//tested for today's competition
  });
});