describe('Manage Competitions Page', () => {
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlkIjoxLCJleHAiOjk5OTk5OTk5OTl9' +
    '.mock';

  const adminProfileResponse = {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    role: 'Admin',
  };

  function setupIntercepts() {
    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: adminProfileResponse,
    }).as('getProfile');

    cy.intercept('GET', '**/auth/preferences**', {
      statusCode: 200,
      body: { theme: 'light', notifications_enabled: true },
    });

    cy.intercept('POST', '**/logger**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/log**', { statusCode: 200, body: {} });
    cy.intercept('POST', '**/analytics**', { statusCode: 200, body: {} });
    cy.intercept('GET', '**/analytics**', { statusCode: 200, body: {} });

    cy.intercept('GET', /\/competitions(\?.*)?$/, {
      statusCode: 200,
      body: {
        total: 2,
        page: 1,
        pageSize: 27,
        items: [
          {
            id: 1,
            competitionTitle: 'Summer Hackathon',
            competitionLocation: 'San Francisco',
            startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
            endDate: new Date(Date.now() + 86400000 * 11).toISOString(),
          },
          {
            id: 2,
            competitionTitle: 'Fall Code Jam',
            competitionLocation: 'Montreal',
            startDate: new Date(Date.now() + 86400000 * 20).toISOString(),
            endDate: new Date(Date.now() + 86400000 * 21).toISOString(),
          },
        ],
      },
    }).as('getCompetitions');
  }

  beforeEach(() => {
    setupIntercepts();

    cy.viewport(1440, 900);
    cy.visit('/app/home', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', mockToken);
        win.localStorage.setItem('sidebar:state', 'expanded');
      },
    });

    cy.wait('@getProfile');

    // Navigate client-side: sidebar → Dashboard → Manage Competitions card
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible').click();
    cy.location('pathname').should('match', /\/app\/dashboard\/?$/);
    cy.contains('a', 'Manage Competitions').should('be.visible').click();
    cy.location('pathname').should('include', '/app/dashboard/competitions');

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
    cy.get('input[placeholder="Search competitions..."]').should('have.value', 'hackathon');
  });

  it('opens filter dropdown and shows status options', () => {
    cy.contains('All competitions').click();
    cy.contains('Active').should('be.visible');
    cy.contains('Upcoming').should('be.visible');
    cy.contains('Completed').should('be.visible');
  });

  it('shows empty state with no results message when search yields nothing', () => {
    cy.intercept('GET', /\/competitions(\?.*)?$/, {
      statusCode: 200,
      body: { total: 0, page: 1, pageSize: 27, items: [] },
    }).as('emptySearch');

    cy.get('input[placeholder="Search competitions..."]').type('zzznomatch');
    cy.wait('@emptySearch');

    cy.contains('No competitions found', { timeout: 8000 }).should('be.visible');
  });

  it('navigates to create competition page on card click', () => {
    cy.contains('Create New Competition').click();
    cy.location('pathname').should('include', 'createCompetition');
  });
});