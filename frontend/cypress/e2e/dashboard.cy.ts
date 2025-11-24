describe('Check Dashboard page', () => {
  it('Visits the dashboard page', () => {
    cy.visit('http://localhost:5173/app/dashboard');
    cy.contains("Overview").should('be.visible');
    cy.contains('Questions solved').should('be.visible');
    cy.contains("Manage Accounts").should('be.visible');
    cy.contains("Number of logins").should('be.visible');
  });
});