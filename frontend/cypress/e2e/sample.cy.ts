describe('Basic E2E Test', () => {
  it('Visits the home page and checks title', () => {
    cy.visit('http://localhost:5173'); // or your dev server URL
    cy.contains('Vite + React');       // check that heading exists
  });
});