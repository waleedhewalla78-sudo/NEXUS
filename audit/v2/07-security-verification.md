# Security Verification

This document provides a detailed security audit of the repository, evaluating authentication, tenant isolation, input validation, rate limiting, and cryptographic implementation.

## Security Audit Summary

| Dimension | Risk Level | Status | Findings / Evidence |
| :--- | :--- | :--- | :--- |
| **Authentication** | **CRITICAL** | **MOCKED_OR_STUBBED** | The API gateway authentication middleware `apiAuthMiddleware` is fully mocked. It comments out API key hashing/verification and allows any request to pass, hardcoding `x-workspace-id` as `mock-workspace-id`. |
| **Tenant Isolation** | **HIGH** | **PARTIALLY_IMPLEMENTED** | Row-Level Security (RLS) is enabled on major tables (`posts`, `ai_agent_configs`, etc.). However, Server Actions (`inbox.ts`, `ai-finetune.ts`, `omnichannel.ts`) bypass RLS entirely by running on a service-role client (`supabaseAdmin`) and failing to authenticate user sessions correctly. |
| **Cryptographic Tokens**| **CRITICAL** | **MOCKED_OR_STUBBED** | Financial refund approval magic links in `/api/tools/approve-refund` decode tokens via Base64 split without signature checks, making the links trivial to forge/tamper. |
| **Rate Limiting** | **CRITICAL** | **MOCKED_OR_STUBBED** | Rate limiting logic via Redis is commented out inside `apiAuthMiddleware`. Public APIs have zero rate limit enforcement. |
| **Input Validation** | **MEDIUM** | **VERIFIED_COMPLETE** | Internal tool proxies validate request structures strictly using `zod` schemas (e.g. `check-order-status`, `issue-refund`). |

---

## Detailed Vulnerability Analysis

### 1. Mocked Public API Gateway Auth (`apiAuthMiddleware.ts`)
The public developer API gateway is completely unauthenticated. The middleware `src/middleware/api-auth.ts` contains:
```typescript
  // Mocking success for scaffold
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-workspace-id', 'mock-workspace-id');
  return NextResponse.next({ ... });
```
Any caller passing any token under the header `Authorization: Bearer <anything>` is authenticated successfully and assigned to the same `mock-workspace-id`. This exposes public API routes to cross-tenant data leakage and complete compromise.

### 2. Insecure Refund Approval Tokens (`approve-refund/route.ts`)
The Magic Link approval GET route decodes parameters with:
```typescript
const decoded = Buffer.from(token, 'base64').toString('utf-8');
const [workspaceId, conversationId, timestamp] = decoded.split(':');
```
It performs no HMAC signature verification or checksum comparison. 
In contrast, post approvals in `src/actions/approvals.ts` utilize:
```typescript
const signature = crypto.createHmac('sha256', SECRET_KEY).update(dataString).digest('base64url');
```
This represents a highly inconsistent security posture: post scheduling is cryptographically secured, while financial refunds are left unprotected.

### 3. Server-Side RLS Bypasses
Server actions are executed on the backend, where many of them initialize the Supabase client using the **Service Role Key** (`supabaseAdmin`). Because the Service Role key bypasses all Row-Level Security checks, tenant isolation must be strictly enforced manually in every query. 
However, actions such as `uploadMedia.ts` use the admin client but fail to extract the user's session ID properly (due to the `auth.getSession()` bug), failing closed to `Unauthenticated` rather than checking tenant boundaries.

### 4. Input Sanitization
PII Redaction in `src/utils/pii.ts` is implemented using simple regular expressions for email and phone numbers. It does not handle advanced text injection, SQL injection attempts inside user queries, or credit card numbers, which could lead to model training poisoning.
