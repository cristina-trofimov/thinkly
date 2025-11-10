// cypress/e2e/loginPage.cy.js

describe("LoginPage", () => {
    beforeEach(() => {
        // Visit the login page (adjust the path if needed)
        cy.visit("/");
    });

    it("should render the Thinkly logo and link", () => {
        cy.get('a[href="#"]').should("exist").within(() => {
            cy.get("img[alt='Your icon']").should("be.visible");
            cy.contains("Thinkly").should("exist");
        });
    });

    it("should show the SCS logo on large screens", () => {
        // Simulate a large screen
        cy.viewport(1200, 800);
        cy.get("div.bg-primary img[alt='Image']").should("be.visible");
    });

    it("should hide the SCS logo on small screens", () => {
        cy.viewport(768, 600); // simulate smaller than lg breakpoint
        cy.get("div.bg-primary img[alt='Image']").should("not.be.visible");
    });

    it("should have proper layout classes", () => {
        cy.get("div.grid").should("have.class", "lg:grid-cols-2");
        cy.get("div.flex.flex-col").should("exist");
    });
});
