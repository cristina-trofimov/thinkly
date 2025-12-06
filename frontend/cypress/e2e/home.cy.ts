describe('Home Page', () => {
  it('registers a new user and loads the homepage', () => {
    // 1. Create a random email so the backend doesn't reject it as a duplicate
    const uniqueId = Date.now();
    const email = `john.doe.${uniqueId}@example.com`;

    // 2. Visit the page
    cy.visit('/');

    // 3. Switch to Register mode
    // (Ensure this button actually toggles the form to "Sign Up")
    cy.get('button[type="button"]').click();

    // 4. Fill out the form with the UNIQUE email
    cy.get('input[id="first_name"]').type('John');
    cy.get('input[id="last_name"]').type('Doe');
    cy.get('input[id="email"]').type(email); // <--- Using the random email
    cy.get('input[id="password"]').type('123456'); // Use a stronger password just in case
    cy.get('input[id="confirm_password"]').type('123456');

    // 5. Submit
    cy.get('button[type="submit"]').click();

    // 6. Verify Redirect
    // Wait up to 15s for the backend to process the new user
    cy.contains("It's Competition Time!", { timeout: 15000 }).should('be.visible');
  });
});