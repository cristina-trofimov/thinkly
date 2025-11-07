describe('ManageCompetitions Component', () => {
  beforeEach(() => {
    // Visit the page where ManageCompetitions is rendered
    cy.visit('/dashboard/competitions');
  });

  describe('Initial Rendering', () => {
    it('should render the search input', () => {
      cy.get('input[placeholder="Search competitions..."]').should('be.visible');
    });

    it('should render the filter dropdown button', () => {
      cy.contains('button', 'All competitions').should('be.visible');
    });

    it('should render all competition cards', () => {
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
    });

    it('should render competition descriptions', () => {
      cy.contains('short one line description of comp...').should('exist');
    });

    it('should render View buttons for each competition', () => {
      cy.contains('button', 'View').should('have.length', 2);
    });

    it('should render the Create New Competition card', () => {
      cy.contains('Create New Competition').should('be.visible');
    });

    it('should display search icon', () => {
      cy.get('svg').first().should('be.visible');
    });

    it('should display filter icon', () => {
      cy.get('button').contains('All competitions').find('svg').should('exist');
    });
  });

  describe('Search Functionality', () => {
    it('should filter competitions by name', () => {
      cy.get('input[placeholder="Search competitions..."]').type('Comp #1');
      
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('not.exist');
    });

    it('should filter competitions by description', () => {
      cy.get('input[placeholder="Search competitions..."]').type('description');
      
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
    });

    it('should be case-insensitive', () => {
      cy.get('input[placeholder="Search competitions..."]').type('comp #2');
      
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
      cy.contains('Comp #1 - 12/10/25').should('not.exist');
    });

    it('should show no results message when search matches nothing', () => {
      cy.get('input[placeholder="Search competitions..."]').type('nonexistent');
      
      cy.contains('No competitions found matching your filters.').should('be.visible');
      cy.contains('Comp #1').should('not.exist');
      cy.contains('Comp #2').should('not.exist');
    });

    it('should show all competitions when search is cleared', () => {
      cy.get('input[placeholder="Search competitions..."]')
        .type('Comp #1')
        .clear();
      
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
    });

    it('should keep Create New Competition card visible during search', () => {
      cy.get('input[placeholder="Search competitions..."]').type('Comp #1');
      cy.contains('Create New Competition').should('be.visible');
    });
  });

  describe('Filter Functionality', () => {
    it('should open filter dropdown when clicked', () => {
      cy.contains('button', 'All competitions').click();
      
      cy.contains('Filter by Status').should('be.visible');
      cy.contains('[role="menuitem"]', 'All').should('be.visible');
      cy.contains('[role="menuitem"]', 'Active').should('be.visible');
      cy.contains('[role="menuitem"]', 'Upcoming').should('be.visible');
      cy.contains('[role="menuitem"]', 'Completed').should('be.visible');
    });

    it('should filter by Active status', () => {
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Active').click();
      
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('not.exist');
    });

    it('should filter by Upcoming status', () => {
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Upcoming').click();
      
      cy.contains('Comp #1 - 12/10/25').should('not.exist');
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
    });

    it('should show no results when filtering by Completed status', () => {
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Completed').click();
      
      cy.contains('No competitions found matching your filters.').should('be.visible');
    });

    it('should reset filter when selecting All', () => {
      // First apply a filter
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Active').click();
      
      // Then reset
      cy.contains('button', 'Active').click();
      cy.contains('[role="menuitem"]', 'All').click();
      
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
    });

    it('should update filter button text when filter is applied', () => {
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Active').click();
      
      cy.contains('button', 'Active').should('be.visible');
    });
  });

  describe('Combined Search and Filter', () => {
    it('should apply both search and filter together', () => {
      // Apply search
      cy.get('input[placeholder="Search competitions..."]').type('Comp');
      
      // Apply filter
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Active').click();
      
      // Should only show Comp #1
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('not.exist');
    });

    it('should show no results when search and filter have no matches', () => {
      cy.get('input[placeholder="Search competitions..."]').type('Comp #2');
      
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Active').click();
      
      cy.contains('No competitions found matching your filters.').should('be.visible');
    });
  });

  describe('Button Interactions', () => {
    it('should log to console when View button is clicked', () => {
      cy.window().then((win) => {
        cy.spy(win.console, 'log').as('consoleLog');
      });
      
      cy.contains('button', 'View').first().click();
      
      cy.get('@consoleLog').should('be.calledWith', 'View competition:', '1');
    });

    it('should have hover effect on View buttons', () => {
      cy.contains('button', 'View').first()
        .trigger('mouseover')
        .should('have.class', 'hover:bg-accent');
    });

    it('should log to console when Create New Competition card is clicked', () => {
      cy.window().then((win) => {
        cy.spy(win.console, 'log').as('consoleLog');
      });
      
      cy.contains('Create New Competition').click();
      
      cy.get('@consoleLog').should('be.calledWith', 'Create new competition');
    });

    it('should have hover effect on Create New Competition card', () => {
      cy.contains('Create New Competition')
        .parent()
        .parent()
        .trigger('mouseover')
        .should('have.class', 'hover:shadow-lg');
    });

    it('should have cursor-pointer on Create New Competition card', () => {
      cy.contains('Create New Competition')
        .parent()
        .parent()
        .should('have.class', 'cursor-pointer');
    });
  });

  describe('Card Styling', () => {
    it('should display competition cards with correct styling', () => {
      cy.contains('Comp #1 - 12/10/25')
        .parent()
        .parent()
        .should('have.class', 'rounded-2xl')
        .and('have.class', 'border-border');
    });

    it('should display color squares with correct dimensions', () => {
      cy.get('.min-h-\\[146px\\]').should('exist');
      cy.get('.min-w-\\[146px\\]').should('exist');
    });

    it('should center competition names', () => {
      cy.contains('Comp #1 - 12/10/25')
        .should('have.class', 'text-center');
    });

    it('should display muted text for descriptions', () => {
      cy.contains('short one line description of comp...')
        .should('have.class', 'text-muted-foreground');
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide filter text on mobile', () => {
      cy.viewport('iphone-x');
      cy.contains('button', 'All competitions')
        .find('span')
        .should('have.class', 'hidden');
    });

    it('should show filter text on desktop', () => {
      cy.viewport(1280, 720);
      cy.contains('button', 'All competitions')
        .find('span')
        .should('have.class', 'md:inline-flex');
    });
  });

  describe('Accessibility', () => {
    it('should have proper input placeholder', () => {
      cy.get('input[placeholder="Search competitions..."]')
        .should('have.attr', 'placeholder', 'Search competitions...');
    });

    it('should have accessible button roles', () => {
      cy.get('button[role="combobox"]').should('exist');
      cy.contains('button', 'View').should('have.attr', 'type', 'button');
    });

    it('should have proper dropdown menu structure', () => {
      cy.contains('button', 'All competitions').click();
      cy.get('[role="menu"]').should('be.visible');
      cy.get('[role="menuitem"]').should('have.length.at.least', 4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid filter changes', () => {
      cy.contains('button', 'All competitions').click();
      cy.contains('[role="menuitem"]', 'Active').click();
      
      cy.contains('button', 'Active').click();
      cy.contains('[role="menuitem"]', 'Upcoming').click();
      
      cy.contains('button', 'Upcoming').click();
      cy.contains('[role="menuitem"]', 'All').click();
      
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
      cy.contains('Comp #2 - 12/10/25').should('be.visible');
    });

    it('should handle search with special characters', () => {
      cy.get('input[placeholder="Search competitions..."]').type('#1');
      cy.contains('Comp #1 - 12/10/25').should('be.visible');
    });

    it('should maintain Create card visibility with no results', () => {
      cy.get('input[placeholder="Search competitions..."]').type('xyz123');
      cy.contains('No competitions found matching your filters.').should('be.visible');
      cy.contains('Create New Competition').should('be.visible');
    });
  });
});