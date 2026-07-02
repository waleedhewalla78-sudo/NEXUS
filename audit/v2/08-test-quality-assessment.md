# Test Quality Assessment

This document provides a critical evaluation of the automated testing suites (unit, integration, E2E, and load testing) in the repository.

## Test Suite Inventory

| Test Type | Test Framework | Target Files / Scope | Total Tests | Mocking Profile | Effectiveness |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Unit Testing** | Vitest | `src/app/api/tools/__tests__/proxy-routes.test.ts` | 6 | Mocked Supabase Client | **HIGH** (Tests routes, input validation, and expected responses) |
| **E2E Testing** | Playwright | `e2e/ai-agent.spec.ts` | 3 | Real endpoints, manual QA annotations | **LOW** (Stubs out critical assertions; has no database mocks) |
| **Load Testing** | k6 | `load-tests/` | 4 | Hits live webhook endpoints | **LOW** (Accepts HTTP 500 responses as success; cannot verify data integrity) |

---

## Technical Gaps & Flaws in Test Quality

### 1. Mocked-Assertion E2E Tests (Stubs)
The Playwright E2E suite (`e2e/ai-agent.spec.ts`) does not programmatically verify outcomes for critical AI features:
*   **PII Redaction Test:** Lacks any assertions. Instead, it relies on manual verification:
    ```typescript
    test.info().annotations.push({
      type: 'QA Manual Check',
      description: 'Verify Dify API network tab or `ai_conversation_logs` for `[REDACTED_EMAIL]`'
    });
    ```
*   **HITL Magic Link Test:** Bypasses programmatic checking. After invoking the webhook and waiting for 5 seconds, it simply adds an annotation and succeeds:
    ```typescript
    test.info().annotations.push({
      type: 'Verification',
      description: 'Check Chatwoot Conversation 1002. A private note should exist...'
    });
    ```
These tests will always pass in a CI/CD pipeline, even if the backend is broken and fails to redact PII or send magic links.

### 2. Invalid Load Testing Assertions
The k6 load testing script for post creation (`load-tests/post-creation.js`) uses a mock Server Action header (`Next-Action: createPost-action-id`). Because the action ID is mocked, Next.js will return HTTP 500 errors. 
To bypass this, the check constraint in k6 was written as:
```javascript
check(res, {
  'status is 200 or 500 (since action ID is mock)': (r) => r.status === 200 || r.status === 500,
});
```
This means a 100% failure rate (HTTP 500) is marked as a **PASS** by the load testing runner. The test only measures the round-trip response latency of the crash page, rather than verifying system throughput.

### 3. Extremely Low Unit Test Coverage
There is **only one unit test file** in the entire codebase (`proxy-routes.test.ts`), covering three API proxy routes.
*   **0% Unit Test Coverage** on all 23 Server Actions (which contain the core business logic for billing, post scheduling, fine-tuning, and omnichannel provisioning).
*   **0% Unit Test Coverage** on React components, context providers, state stores, and the database RPC functions.

### 4. Flaky Live Database Dependencies
The FastAPI test file (`ml-service/test_api.py`) runs unit tests by calling the database endpoints directly. However, it does not mock the Supabase python client. 
If the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set during CI execution, the test suite immediately crashes with an HTTP 500, making the tests unsuitable for standard automated container validation.
