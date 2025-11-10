describe('Check Home page', () => {
  beforeEach(() => {
    // Inject config into window before the page loads
    Cypress.on('window:before:load', (win) => {
      win.config = { backendUrl: Cypress.env('BACKEND_URL') || 'http://localhost:8000' };
    });})
  
    it('Visits the home page and filters questions', () => {
      cy.intercept('GET', `${Cypress.env('BACKEND_URL')}/problems*`, {
        statusCode: 200,
        body: [
          { id: 1, title: "Valid Parentheses", difficulty: "Easy" },
          { id: 2, title: "Two Sum", difficulty: "Easy" },
        ],
      }).as('getProblems');
      
      cy.visit('http://localhost:5173/app/leaderboards');
      cy.wait('@getProblems');
      
      cy.contains("It's Competition Time!").should('be.visible');
      cy.contains('Filter Difficulties').should('be.visible').click();
      cy.get('[data-testid="filter-easy"]').should('be.visible').click();
      cy.contains("Valid Parentheses").should('be.visible');
    });
    
    it('Shows upcoming competitions', () => {
      cy.intercept('GET', `${Cypress.env('BACKEND_URL')}/competitions*`, {
        statusCode: 200,
        body: [
          { id: 1, name: "AI Coding Sprint", date: "2025-11-09T00:00:00Z" },
        ],
      }).as('getCompetitions');
      
      cy.visit('http://localhost:5173/app/leaderboards');
      cy.wait('@getCompetitions');
      
      cy.contains("Competitions on").should('be.visible');
      cy.contains("AI Coding Sprint").should('be.visible');
    });
  }
  );