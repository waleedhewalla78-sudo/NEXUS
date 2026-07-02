-- Refresh PostgREST schema cache after migrations
NOTIFY pgrst, 'reload schema';
