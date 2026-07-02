-- Mock Supabase Schema for Local PostgreSQL Setup
-- -------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create auth schema and users table
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mock auth helper functions
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claim.sub', true),
        '00000000-0000-0000-0000-000000000000'
    )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() 
RETURNS text 
LANGUAGE sql 
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claim.role', true),
        'authenticated'
    );
$$;

-- 2. Create storage schema and tables
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_id TEXT REFERENCES storage.buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    owner UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on storage tables
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all actions for local dev testing
DROP POLICY IF EXISTS "Local dev access buckets" ON storage.buckets;
CREATE POLICY "Local dev access buckets" ON storage.buckets FOR ALL USING (true);

DROP POLICY IF EXISTS "Local dev access objects" ON storage.objects;
CREATE POLICY "Local dev access objects" ON storage.objects FOR ALL USING (true);

-- 3. Mock pg_cron extension for standard local databases
CREATE SCHEMA IF NOT EXISTS cron;
CREATE OR REPLACE FUNCTION cron.schedule(job_name text, schedule text, command text)
RETURNS bigint
LANGUAGE sql
AS $$
    SELECT 1::bigint;
$$;

-- 4. Create standard Supabase roles if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END
$$;
