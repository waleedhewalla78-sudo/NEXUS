import '@testing-library/jest-dom';
// Load env vars for tests
process.env.INTERNAL_TOOL_SECRET = 'test-secret-123';
process.env.APPROVAL_HMAC_SECRET = 'test-oauth-state-secret-min-32-chars!!';
process.env.TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
