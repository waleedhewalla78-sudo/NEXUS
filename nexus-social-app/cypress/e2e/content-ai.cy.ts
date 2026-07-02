/// <reference types="cypress" />

describe('Module 2: Content Publishing & AI (Sprints 2, 7, 11)', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@agency.com');
    cy.get('input[name="password"]').type('password123');
    cy.contains('button', 'Sign In').click();
    cy.url().should('include', '/dashboard');
  });

  it('AI-PII-01: AI Caption Generation & PII Redaction', () => {
    // Intercept the outgoing API call to Dify
    cy.intercept('POST', '**/api/dify/generate').as('difyRequest');

    cy.visit('/posts/create');
    const rawContent = 'Write a post about our sale. Contact john@test.com or 555-0199.';
    cy.get('textarea').type(rawContent);
    cy.contains('Generate with AI').click();

    cy.wait('@difyRequest').then((interception) => {
      const payload = interception.request.body;
      // Assert that PII is redacted in the outgoing payload
      expect(payload.content).to.include('[REDACTED_EMAIL]');
      expect(payload.content).to.include('[REDACTED_PHONE]');
      expect(payload.content).not.to.include('john@test.com');
      expect(payload.content).not.to.include('555-0199');
    });
  });

  it('UI-PREV-01: Social Preview & Platform-Specific Truncation', () => {
    cy.visit('/posts/create');
    cy.contains('label', 'Twitter').click();
    
    // Generate a 300 character string
    const longText = 'A'.repeat(300);
    cy.get('textarea').type(longText, { delay: 0 });

    // Assuming the preview component renders the text and truncates
    cy.get('.text-\\[15px\\]').invoke('text').then((text) => {
      // Twitter limits to 280, plus '...'
      expect(text.length).to.be.at.most(283);
      expect(text).to.include('...');
    });
  });

  it('APPR-MAGIC-01: Client Approval Magic Link', () => {
    // Hit a mock invalid token route
    cy.visit('/approve/invalid_token_123', { failOnStatusCode: false });
    // UI should display unauthorized or expired message
    cy.contains(/Unauthorized|Invalid/i).should('exist');
  });
});
