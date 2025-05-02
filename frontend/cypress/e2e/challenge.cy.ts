describe('Challenge System', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  it('displays challenge list', () => {
    cy.visit('/challenges');
    cy.contains('挑战列表');
    cy.get('[data-testid="challenge-card"]').should('have.length.at.least', 1);
  });

  it('can filter challenges by difficulty', () => {
    cy.visit('/challenges');
    cy.get('[data-testid="difficulty-filter"]').select('中等');
    cy.get('[data-testid="challenge-card"]').each(($card) => {
      cy.wrap($card).find('[data-testid="difficulty-badge"]').should('contain', '中等');
    });
  });

  it('can start a challenge', () => {
    cy.visit('/challenges/1');
    cy.get('[data-testid="start-challenge-btn"]').click();
    cy.get('[data-testid="terminal"]').should('exist');
    cy.get('[data-testid="challenge-status"]').should('contain', '进行中');
  });

  it('can submit flag', () => {
    cy.startChallenge(1);
    cy.visit('/challenges/1');
    cy.get('[data-testid="flag-input"]').type('test-flag');
    cy.get('[data-testid="submit-flag-btn"]').click();
    cy.get('[data-testid="submission-result"]').should('exist');
  });
});