describe('Manage Competitions Page', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9' +
    '.mock';

  beforeEach(() => {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: {
        id: 1,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        accountType: 'Admin',
      },
    }).as('getProfile');

    cy.intercept('GET', '**/auth/preferences*', {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true },
    }).as('getPreferences');

    // Match the paginated competitions endpoint — cover both /competitions and /competitions/
    cy.intercept('GET', '**/competitions*', {
      statusCode: 200,
      body: {
        total: 2,
        page: 1,
        page_size: 27,
        items: [
          {
            id: 1,
            competition_title: 'Summer Hackathon',
            competition_location: 'San Francisco',
            start_date: new Date(Date.now() + 86400000 * 10).toISOString(),
            end_date: new Date(Date.now() + 86400000 * 11).toISOString(),
          },
          {
            id: 2,
            competition_title: 'Fall Code Jam',
            competition_location: 'Montreal',
            start_date: new Date(Date.now() + 86400000 * 20).toISOString(),
            end_date: new Date(Date.now() + 86400000 * 21).toISOString(),
          },
        ],
      },
    }).as('getCompetitions');

    cy.visit('/app/dashboard/competitions', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
      },
    });

    cy.wait('@getProfile');
    cy.wait('@getCompetitions');
  });

  it('Checks all elements are present', () => {
    cy.contains('Manage Competitions').should('be.visible');
    cy.contains('Create New Competition').should('be.visible');
    cy.contains('All competitions').should('be.visible');
    cy.get('input[placeholder="Search competitions..."]').should('be.visible');
  });

  it('renders competition cards', () => {
    cy.contains('Summer Hackathon').should('be.visible');
    cy.contains('Fall Code Jam').should('be.visible');
  });

  it('shows search input that calls onSearchChange', () => {
    cy.get('input[placeholder="Search competitions..."]').type('hackathon');
    // After typing the search query is reflected in the input
    cy.get('input[placeholder="Search competitions..."]').should('have.value', 'hackathon');
  });

  it('opens filter dropdown and shows status options', () => {
    cy.contains('All competitions').click();
    cy.contains('Active').should('be.visible');
    cy.contains('Upcoming').should('be.visible');
    cy.contains('Completed').should('be.visible');
  });

  it('shows empty state with no results message when search yields nothing', () => {
    cy.intercept('GET', '**/competitions*', {
      statusCode: 200,
      body: { total: 0, page: 1, page_size: 27, items: [] },
    }).as('emptySearch');

    cy.get('input[placeholder="Search competitions..."]').type('zzznomatch');
    cy.wait('@emptySearch');

    cy.contains('No competitions found').should('be.visible');
  });

  it('navigates to create competition page on card click', () => {
    cy.contains('Create New Competition').click();
    cy.location('pathname').should('include', 'createCompetition');
  });
});