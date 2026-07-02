/// <reference types="cypress" />

describe('Critical Path: Post Creation to Analytics', () => {
  before(function () {
    if (!Cypress.env('TEST_EMAIL') || !Cypress.env('TEST_PASSWORD')) {
      this.skip();
    }
  });

  beforeEach(() => {
    cy.loginIfConfigured();
  });

  it('navigates through the main features successfully', () => {
    cy.visit('/');
    cy.contains('Welcome back', { timeout: 30_000 }).should('be.visible');
    cy.contains('Quick actions').should('be.visible');

    cy.contains('a', 'Calendar').click();
    cy.url().should('include', '/calendar');
    cy.contains('Content Calendar').should('be.visible');

    cy.contains('a', 'Create Post').click();
    cy.url().should('include', '/posts/create');
    cy.contains('Draft New Post').should('be.visible');

    cy.get('textarea[placeholder="What do you want to share?"]').type('This is an E2E test post');
    cy.contains('label', 'Twitter').click();

    cy.contains('Back to Calendar').click();
    cy.url().should('include', '/calendar');

    cy.contains('a', 'Reputation').click();
    cy.url().should('include', '/reputation');
    cy.contains('Reputation Management').should('be.visible');

    cy.contains('a', 'Analytics').click();
    cy.url().should('include', '/analytics');
    cy.contains('Analytics Dashboard').should('be.visible');
    cy.contains('Total Posts').should('be.visible');
  });
});

describe('Public smoke routes', () => {
  it('loads login and setup pages', () => {
    cy.visit('/login');
    cy.contains('Sign in to Nexus Social').should('be.visible');

    cy.request('/api/health').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.details.db).to.eq('up');
    });

    cy.visit('/setup');
    cy.contains('Database Setup').should('be.visible');
  });
});
