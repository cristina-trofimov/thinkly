describe('Check Home page', () => {
  beforeEach(() => {
    // Set window.config
    Cypress.on('window:before:load', (win) => {
      win.config = { backendUrl: Cypress.env('BACKEND_URL') || 'http://localhost:8000' };
    });

    // Intercept and mock the questions API
    cy.intercept('GET', `**/get-questions`, {
      statusCode: 200,
      body: [
        { id: 1, questionTitle: "Two Sum", date: "2025-08-02", difficulty: "Easy" },
        { id: 2, questionTitle: "Palindrome", date: "2025-08-15", difficulty: "Medium" },
        { id: 3, questionTitle: "Merge K Sorted Lists", date: "2025-07-01", difficulty: "Hard" },
        { id: 4, questionTitle: "Christmas Tree", date: "2025-07-12", difficulty: "Easy" },
        { id: 5, questionTitle: "Inverse String", date: "2025-08-03", difficulty: "Easy" },
        { id: 6, questionTitle: "Hash Map", date: "2025-08-03", difficulty: "Medium" },
        { id: 7, questionTitle: "Binary Tree", date: "2025-08-19", difficulty: "Hard" },
      ],
    }).as('getQuestions');

    // Intercept and mock the competitions API
    cy.intercept('GET', `**/get-competitions`, {
      statusCode: 200,
      body: [
        { competitionTitle: "AI Coding Sprint", date: "2025-11-03" },
        { competitionTitle: "CyberComp", date: "2025-11-09" },
      ],
    }).as('getCompetitions');
  });

  it('displays main competition button', () => {
    cy.visit('/');
    cy.contains("It's Competition Time!").should('be.visible');
  });

  it('displays questions from API', () => {
    cy.visit('/');
    
    // Wait for the intercepted API call
    cy.wait('@getQuestions');
    
    // Now check for questions
    cy.contains('Two Sum', { timeout: 5000 }).should('be.visible');
    cy.contains('Palindrome').should('be.visible');
  });

  it('filters questions by difficulty', () => {
    cy.visit('/');
    
    // Wait for questions to load
    cy.wait('@getQuestions');
    cy.contains('Two Sum', { timeout: 5000 }).should('be.visible');
    cy.contains('Palindrome').should('be.visible');
    
    // Click Medium filter
    cy.get('[data-testid="filter-medium"]')
      .should('be.visible')
      .click({ force: true });
    
    // Wait for filter to apply
    cy.wait(500);
    
    // Verify Medium question is visible
    cy.contains("Palindrome").should('be.visible');
    
    // Verify Easy question is NOT visible
    cy.contains("Two Sum").should('not.exist');
  });

  it('shows upcoming competitions', () => {
    cy.visit('/');
    
    // Wait for competitions to load
    cy.wait('@getCompetitions');
    
    cy.contains("Competitions on").should('be.visible');
    
    // Click on November 3rd to show AI Coding Sprint
    cy.get('button[name="day"]').contains('3').click();
    
    // Now the competition should appear
    cy.contains("AI Coding Sprint", { timeout: 5000 }).should('be.visible');
  });

});