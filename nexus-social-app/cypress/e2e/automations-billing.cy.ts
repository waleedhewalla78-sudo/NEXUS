/// <reference types="cypress" />

describe('Module 4 & 5: Automations & Billing', () => {
  before(function () {
    if (!Cypress.env('TEST_EMAIL') || !Cypress.env('TEST_PASSWORD')) {
      this.skip();
    }
  });

  beforeEach(() => {
    cy.loginIfConfigured();
  });

  it('AUTO-TMPL-01: Use Template loads React Flow canvas', () => {
    cy.visit('/automations/builder');
    cy.contains('Automation Templates').should('be.visible');
    cy.contains('button', 'Use Template').first().click();
    cy.contains('Visual Automations', { timeout: 30_000 }).should('be.visible');
    cy.get('.react-flow__node', { timeout: 15_000 }).should('have.length.greaterThan', 0);
  });

  it('BILL-STRIPE-01: Stripe webhook rejects invalid signature', () => {
    cy.request({
      method: 'POST',
      url: '/api/webhooks/stripe',
      body: { type: 'invoice.payment_failed', data: { object: {} } },
      headers: { 'Stripe-Signature': 'invalid' },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([400, 401, 403, 500]);
    });
  });
});
