import { supabaseAdmin } from '../lib/supabase/server';
import { processMigrationJob } from '../jobs/process-migration';

async function checkAndProcessMigrations() {
  console.log('[Migration Worker] Checking for pending migrations...');
  try {
    const { data: migrations, error } = await supabaseAdmin
      .from('migration_status')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Migration Worker] Database error:', error.message);
      return;
    }

    if (!migrations || migrations.length === 0) {
      return;
    }

    console.log(`[Migration Worker] Found ${migrations.length} pending migrations.`);
    for (const migration of migrations) {
      console.log(`[Migration Worker] Processing migration: ${migration.id}`);
      try {
        await processMigrationJob(migration.id);
      } catch (err: any) {
        console.error(`[Migration Worker] Failed to process migration ${migration.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Migration Worker] Loop error:', err.message);
  }
}

async function start() {
  console.log('[Migration Worker] Started background migration worker loop.');
  while (true) {
    await checkAndProcessMigrations();
    // Poll every 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

start().catch((err) => {
  console.error('[Migration Worker] Fatal error:', err);
  process.exit(1);
});
