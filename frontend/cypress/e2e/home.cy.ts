it('loads the homepage components', () => {
  // 1. Visit login page first (if needed)
  cy.visit('/');

  // 2. Type into your login inputs (inspect your login form for IDs/names)
  cy.get('button[type="button"]').click();
  cy.get('input[id="first_name"]').type('john'); 
  cy.get('input[id="last_name"]').type('doe');
  cy.get('input[id="email"]').type('john.doe@example.com');
  cy.get('input[id="password"]').type('1234');
  cy.get('input[id="confirm_password"]').type('1234');
  cy.get('button[type="submit"]').click();



  // 3. NOW check for the homepage content
  // We increase timeout in case login takes a moment
  cy.contains("It's Competition Time!", { timeout: 10000 }).should('be.visible');
});