describe('Manage Competitions Page', () => {
  it('Visits the manage competitions page and checks all elements are present', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');
    
    // Check search input exists
    cy.get('input[placeholder="Search competitions..."]').should('be.visible');
    
    // Check filter button exists
    cy.contains('All competitions').should('be.visible');
    
    // Check competition cards are visible
    cy.contains('Comp #1 - 12/10/25').should('be.visible');
    cy.contains('Comp #2 - 12/10/25').should('be.visible');
    cy.contains('short one line description of comp...').should('be.visible');
    
    // Check Create New Competition card
    cy.contains('Create New Competition').should('be.visible');
    
    // Check View buttons exist
    cy.contains('button', 'View').should('exist');
  });

  it('Filters competitions by search', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');
    
    // Search for Comp #1
    cy.get('input[placeholder="Search competitions..."]').type('Comp #1');
    cy.contains('Comp #1 - 12/10/25').should('be.visible');
    cy.contains('Comp #2 - 12/10/25').should('not.exist');
    
    // Clear and search for Comp #2
    cy.get('input[placeholder="Search competitions..."]').clear().type('Comp #2');
    cy.contains('Comp #2 - 12/10/25').should('be.visible');
    cy.contains('Comp #1 - 12/10/25').should('not.exist');
    
    // Search for non-existent competition
    cy.get('input[placeholder="Search competitions..."]').clear().type('nonexistent');
    cy.contains('No competitions found matching your filters.').should('be.visible');
  });

  it('Filters competitions by status', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');
  
    // Open filter dropdown
    cy.contains('button', 'All competitions').click();
    cy.contains('Filter by Status').should('be.visible');
  
    // Filter by Active
    cy.contains('[role="menuitem"]', 'Active').click();
    cy.contains('Comp #1 - 12/10/25').should('be.visible');
    cy.contains('Comp #2 - 12/10/25').should('not.exist');
  
});

  it('Clicks View button and Create New Competition card', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');
    
    // Click View button
    cy.contains('button', 'View').first().click();
    
    // Click Create New Competition card
    cy.contains('Create New Competition').click();
  });
});