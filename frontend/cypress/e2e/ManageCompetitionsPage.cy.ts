describe('Manage Competitions Page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: { role: 'admin', firstName: 'Admin', lastName: 'User', id: 1 }
    }).as('getProfile');

    cy.intercept('GET', '**/competitions/**', {
      statusCode: 200,
      body: {
        total: 1,
        page: 1,
        page_size: 27,
        items: [
          {
            id: 1,
            competition_title: 'Summer Hackathon',
            competition_location: 'San Francisco',
            start_date: '2024-06-01',
            end_date: '2024-06-02',
          },
        ],
      },
    }).as('getCompetitions');

    // Single visit, relative path, same pattern as dashboard.cy.ts
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9.mock';
    cy.visit('/app/dashboard/competitions', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    cy.wait(['@getProfile', '@getCompetitions']);
  });

  it('Checks all elements are present', () => {
    cy.contains('All competitions').should('be.visible');
    cy.contains('Create New Competition').should('be.visible');
  });
});
