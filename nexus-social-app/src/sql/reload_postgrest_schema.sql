-- Reload PostgREST schema cache (run in Supabase SQL Editor when reads work but writes fail)
NOTIFY pgrst, 'reload schema';
