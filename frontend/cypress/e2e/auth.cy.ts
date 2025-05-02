describe('Authentication', () => {
  it('can login successfully', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-btn"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('shows error on invalid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-btn"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('can logout', () => {
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-btn"]').click();
    cy.url().should('include', '/login');
  });
});