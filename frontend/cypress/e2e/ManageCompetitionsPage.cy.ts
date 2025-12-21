describe('Manage Competitions Page', () => {
  beforeEach(() => {
    // Mock the competitions API call
    cy.intercept('GET', '**/competitions*', {
      statusCode: 200,
      body: [
        {
          id: '1',
          competitionTitle: 'Test Competition',
          competitionLocation: 'Test Location',
          date: new Date().toISOString(), // Active competition
        },
        {
          id: '2',
          competitionTitle: 'Another Competition',
          competitionLocation: 'Another Location',
          date: new Date(Date.now() + 86400000).toISOString(), // Upcoming
        }
      ]
    }).as('getCompetitions');
  });

  it('Visits the manage competitions page and checks all elements are present', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');

    // Wait for API call
    cy.wait('@getCompetitions');

    // Check search input exists
    cy.get('input[placeholder="Search competitions..."]').should('be.visible');

    // Check filter button exists
    cy.contains('All competitions').should('be.visible');

    // Check Create New Competition card
    cy.contains('Create New Competition').should('be.visible');

    // Check View buttons exist
    cy.contains('button', 'View').should('exist');
  });

  it('Clicks View button and Create New Competition card', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');

    // Wait for API call
    cy.wait('@getCompetitions');

    // Click View button
    cy.contains('button', 'View').first().click();

    // Visit again for the second test
    cy.visit('http://localhost:5173/app/dashboard/competitions');

    // Click Create New Competition card
    cy.contains('Create New Competition').click();
  });

  it('Filters competitions by search', () => {
    cy.visit('http://localhost:5173/app/dashboard/competitions');


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

});
});