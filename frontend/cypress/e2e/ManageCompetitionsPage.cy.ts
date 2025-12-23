describe('Manage Competitions Page', () => {
  it('Visits the manage competitions page and checks all elements are present', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');

    // Check search input exists
    cy.get('input[placeholder="Search competitions..."]').should('be.visible');

    // Check filter button exists
    cy.contains('All competitions').should('be.visible');

    // Check Create New Competition card
    cy.contains('Create New Competition').should('be.visible');

  });


  it('Filters competitions by status', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');

    // Open filter dropdown
    cy.contains('button', 'All competitions').click();
    cy.contains('Filter by Status').should('be.visible');

    // Filter by Active
    cy.contains('[role="menuitem"]', 'Active').click();

});

  it('Clicks View button and Create New Competition card', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');

    // Click Create New Competition card
    cy.contains('Create New Competition').click();
  });
});