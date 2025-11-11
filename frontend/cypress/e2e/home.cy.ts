describe('Check Home page', () => {
  beforeEach(() => {
    // Inject config into window before the page loads
    Cypress.on('window:before:load', (win) => {
      win.config = { backendUrl: Cypress.env('BACKEND_URL') || 'http://localhost:8000' };
    });})
  
    it('Visits the home page and filters questions', () => {
      cy.intercept('GET', `${Cypress.env('BACKEND_URL')}/homepage/get-questions*`, {
        statusCode: 200,
        body: [
          {
            "id": 1,
            "questionTitle": "Two Sum",
            "date": "2025-11-09T18:36:41.166298",
            "difficulty": "easy"
          },
          {
            "id": 2,
            "questionTitle": "Valid Parentheses",
            "date": "2025-11-09T18:36:41.207719",
            "difficulty": "easy"
          },
        ],
      }).as('getQuestions');

      cy.intercept('GET', `${Cypress.env('BACKEND_URL')}/homepage/get-competitions*`, {
        statusCode: 200,
        body: [],
      }).as('getCompetitions');
      
      cy.visit('http://localhost:5173/app/home');
      cy.wait('@getQuestions');
      cy.wait('@getCompetitions');
      
      cy.contains("It's Competition Time!").should('be.visible');
      cy.contains('Filter Difficulties').should('be.visible').click();
      cy.get('[data-testid="filter-easy"]').should('be.visible').click();
      cy.contains("Valid Parentheses").should('be.visible');
    });
    
   
  }
  );