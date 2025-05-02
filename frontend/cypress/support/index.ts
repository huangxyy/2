import '@testing-library/cypress/add-commands';

// 自定义命令
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      startChallenge(challengeId: number): Chainable<void>;
    }
  }
}

// 登录命令
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem('token', response.body.data.token);
  });
});

// 开始挑战命令
Cypress.Commands.add('startChallenge', (challengeId: number) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/challenges/${challengeId}/start`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`,
    },
  });
});