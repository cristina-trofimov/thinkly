describe('Check Home page', () => {
  it('Visits the home page and filter for different questions', () => {
    cy.visit('http://localhost:5173/app/home');
    cy.contains("It's Competition Time!").should('be.visible');
    cy.contains('Filter Difficulties')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    // Test Easy filter
    cy.get('[data-testid="filter-easy"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains('Two Sum',{ timeout: 5000 }).should('be.visible');

    // Test Medium filter
    cy.get('[data-testid="filter-medium"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains("Palindrome").should('be.visible');

  });
  it('is Upcomming Competitions present', () => {
    cy.visit('http://localhost:5173/app/home');
    cy.contains("Competitions on").should('be.visible');
    cy.contains("Cyber Security Challenge").should('be.visible');//tested for today's competition
  });
});