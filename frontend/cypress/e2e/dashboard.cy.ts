describe('Check Dashboard page', () => {
  it('Visits the dashboard page', () => {
    cy.visit('http://localhost:5173/app/dashboard');
    cy.contains("Overview").should('be.visible');
    cy.contains('Create Competition').click();
    cy.contains('User satisfaction').should('be.visible');
    cy.contains("Manage Accounts").should('be.visible');
    cy.contains("Technical Issues").should('be.visible');
  });
});