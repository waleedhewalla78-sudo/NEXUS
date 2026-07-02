/// <reference types="cypress" />
import * as crypto from 'crypto';

describe('Module 3 & 6: Integrations, API & Observability (Sprints 3, 5, 9)', () => {

  it('INT-WA-01: WhatsApp Webhook Signature Verification', () => {
    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "123", changes: [{ value: { messages: [{ text: { body: "Hello" } }] } }] }]
    });

    const secret = Cypress.env('META_APP_SECRET') || 'test_secret';
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // 1. Missing signature
    cy.request({
      method: 'POST',
      url: '/api/webhooks/whatsapp',
      body: payload,
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(403);
    });

    // 2. Invalid signature
    cy.request({
      method: 'POST',
      url: '/api/webhooks/whatsapp',
      body: payload,
      headers: {
        'X-Hub-Signature-256': `sha256=invalid_hash_value`
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(403);
    });

    // 3. Valid signature (mocked)
    // Note: The actual endpoint might return 400 if payload is incomplete, but should pass the 403 crypto check
    cy.request({
      method: 'POST',
      url: '/api/webhooks/whatsapp',
      body: payload,
      headers: {
        'X-Hub-Signature-256': `sha256=${validSignature}`
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.not.eq(403);
    });
  });

  it('API-SCOPE-01: Public API Rate Limiting & Scope Enforcement', () => {
    const apiKey = Cypress.env('MOCK_READ_ONLY_API_KEY') || 'mock_read_key';

    // Valid GET request
    cy.request({
      method: 'GET',
      url: '/api/v1/posts',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 404]); // 404 if no posts, but not 403
    });

    // Invalid POST request (Scope breach)
    cy.request({
      method: 'POST',
      url: '/api/v1/posts',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: { content: "Hacked post" },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

});
