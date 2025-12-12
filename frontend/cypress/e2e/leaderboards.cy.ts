describe('Leaderboards Page', () => {
  it('loads the leaderboards', () => {
    // 1. Visit the page (UPDATE this URL to match your router!)
    // Based on your previous files, I'm guessing it is inside /app
    cy.visit('/app/leaderboards');

    // 2. Check that the loading text appears initially
    cy.contains('Loading leaderboards...').should('be.visible');

    // 3. Check that the loading text disappears
    cy.contains('Loading leaderboards...', { timeout: 10000 }).should('not.exist');

    // 4. Check that the Search input renders (proof the page finished loading)
    // We assume the SearchAndFilterBar contains a standard <input>
    cy.get('input').should('be.visible');
  });
});