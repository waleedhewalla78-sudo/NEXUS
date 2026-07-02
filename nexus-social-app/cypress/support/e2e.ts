/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginIfConfigured(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginIfConfigured', () => {
  const email = Cypress.env('TEST_EMAIL') as string;
  const password = Cypress.env('TEST_PASSWORD') as string;

  if (!email || !password) {
    cy.log('Skipping login — set CYPRESS_TEST_EMAIL and CYPRESS_TEST_PASSWORD in .env.local');
    return;
  }

  cy.visit('/login');
  cy.get('input[name="email"]').clear().type(email);
  cy.get('input[name="password"]').clear().type(password, { log: false });
  cy.contains('button', 'Sign in').click();
  cy.url({ timeout: 30_000 }).should('not.include', '/login');
});

export {};
