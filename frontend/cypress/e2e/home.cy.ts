describe('Check Home page', () => {
  beforeEach(() => {
  // Inject config into window before the page loads
  Cypress.on('window:before:load', (win) => {
    win.config = { backendUrl: Cypress.env('BACKEND_URL') || 'http://localhost:8000' };
  });})

  it('Visits the home page and filter for different questions', () => {
    cy.visit('http://localhost:5173/app/home');
    cy.contains("It's Competition Time!").should('be.visible');
    cy.contains('Filter Difficulties')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    // Test Medium filter
    cy.get('[data-testid="filter-easy"]')
      .should('be.visible')
      .click({ force: true });
    cy.contains("Valid Parentheses").should('be.visible');

  });
  it('is Upcomming Competitions present', () => {
    cy.visit('http://localhost:5173/app/home');
    cy.contains("Competitions on").should('be.visible');
    cy.contains("AI Coding Sprint-11/9/2025").should('be.visible');//tested for today's competition
  });
}
);