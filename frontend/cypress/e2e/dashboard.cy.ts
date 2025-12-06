describe('Admin Dashboard', () => {
  beforeEach(() => {
    // Replace with your actual local URL (e.g., http://localhost:5173)
    // We assume the user is logged in or the route is accessible
    cy.visit('/app/dashboard');
  });

  it('renders the main dashboard overview', () => {
    // Check for the header
    cy.get('h1').contains('Overview').should('be.visible');

    // Check that the default tab is active
    cy.contains('button', 'Algotime').should('have.attr', 'data-state', 'active');

    // Check that the default time range is displayed
    cy.contains('Last 3 months').should('be.visible');
  });

  it('updates stats when the Time Range filter is changed', () => {
    // 1. Check initial state (3 months data)
    // Based on your getNewAccountsStats logic for "3months"
    cy.contains('Up 10% in the last 3 months').should('be.visible');

    // 2. Open the Select dropdown
    // shadcn/ui Select usually renders the value text in a button/trigger
    cy.contains('Last 3 months').click();

    // 3. Click the "Last 7 days" option
    // Note: shadcn/ui renders options in a portal, often at the body root
    cy.get('[role="option"]').contains('Last 7 days').click();

    // 4. Verify the stats updated
    // Based on your getNewAccountsStats logic for "7days"
    cy.contains('Up 12% in the last 7 days').should('be.visible');
  });

  it('contains correct navigation links for management cards', () => {
    // Verify "Manage Accounts" link
    cy.contains('a', 'Manage Accounts')
      .should('have.attr', 'href', '/app/dashboard/manageAccounts');

    // Verify "Manage Competitions" link
    cy.contains('a', 'Manage Competitions')
      .should('have.attr', 'href', '/app/dashboard/competitions');

    // Verify "Manage Algotime Sessions" link
    cy.contains('a', 'Manage Algotime Sessions')
      .should('have.attr', 'href', '/app/dashboard/algoTimeSession');
  });

  it('switches tabs correctly', () => {
    // Click the Competitions tab
    cy.contains('button', 'Competitions').click();

    // Verify it is now the active tab
    cy.contains('button', 'Competitions').should('have.attr', 'data-state', 'active');
    cy.contains('button', 'Algotime').should('have.attr', 'data-state', 'inactive');
  });
});