import { describe, it, expect, vi } from 'vitest';
import { POST as checkOrderStatus } from '../check-order-status/route';
import { POST as createSupportTicket } from '../create-support-ticket/route';
import { POST as issueRefund } from '../issue-refund/route';

// Mock Supabase to prevent actual network calls during tests
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'mock-ticket-id' }, error: null })
          })
        })
      })
    })
  };
});

function createMockRequest(body: any, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers
    }),
    body: JSON.stringify(body)
  });
}

describe('Internal Tool Proxies', () => {
  describe('check-order-status', () => {
    it('should reject unauthorized requests', async () => {
      const req = createMockRequest({ order_id: 'ORD-123' }, { authorization: 'Bearer wrong-secret' });
      const res = await checkOrderStatus(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized tool access');
    });

    it('should reject invalid Zod payloads', async () => {
      const req = createMockRequest({}, { authorization: 'Bearer test-secret-123' });
      const res = await checkOrderStatus(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid parameters');
    });

    it('should return valid order status for correct parameters', async () => {
      const req = createMockRequest({ order_id: 'ORD-123' }, { authorization: 'Bearer test-secret-123' });
      const res = await checkOrderStatus(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('shipped');
      expect(json.order_id).toBe('ORD-123');
    });
    
    it('should return not_found for hallucinated 99999 orders', async () => {
      const req = createMockRequest({ order_id: 'ORD-99999' }, { authorization: 'Bearer test-secret-123' });
      const res = await checkOrderStatus(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('not_found');
    });
  });

  describe('create-support-ticket', () => {
    it('should create a support ticket successfully', async () => {
      const payload = {
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        subject: 'My account is locked',
        description: 'I cannot log in to my account since yesterday.',
        priority: 'high'
      };
      const req = createMockRequest(payload, { authorization: 'Bearer test-secret-123' });
      const res = await createSupportTicket(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('success');
      expect(json.message).toContain('mock-ticket-id');
    });
  });

  describe('issue-refund', () => {
    it('should return pending_approval for HITL flow', async () => {
      const req = createMockRequest({ order_id: 'ORD-555', amount: 50.00 }, { authorization: 'Bearer test-secret-123' });
      const res = await issueRefund(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('pending_approval');
      expect(json.draft_details.amount).toBe(50.00);
    });
    
    it('should reject negative refund amounts via Zod', async () => {
      const req = createMockRequest({ order_id: 'ORD-555', amount: -10 }, { authorization: 'Bearer test-secret-123' });
      const res = await issueRefund(req);
      expect(res.status).toBe(400);
    });
  });
});
