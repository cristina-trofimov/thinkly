describe('Check Home page', () => {
  it('Visits the home page and filter for different questions', () => {
    cy.visit('http://localhost:5173/home');
    cy.contains("It's Competition Time!").should('be.visible');
    cy.contains('Filter Difficulties')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    // Test Easy filter
    cy.get('[data-testid="filter-easy"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains('Two sum').should('be.visible');

    // Test Medium filter
    cy.get('[data-testid="filter-medium"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains("Palindrome").should('be.visible');

    // Test Hard filter
    cy.get('[data-testid="filter-hard"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains("Binary Tree").should('be.visible');
  });
  it('is Upcomming Competitions present', () => {
    cy.visit('http://localhost:5173/home');
    cy.contains("Upcoming Competitions").should('be.visible');
    cy.contains("WebComp").should('be.visible');
    cy.contains("45 mins to complete as many riddles as possible").should('be.visible');
    cy.contains('Registered').click();
    cy.contains('Join').click();
  });
});