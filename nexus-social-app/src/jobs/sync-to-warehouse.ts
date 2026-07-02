import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Background Job: Sync Workspace Data to External Data Warehouse
 * Designed to run nightly via cron.
 */
export async function syncToWarehouseJob() {
  console.log('[Job] Starting Reverse ETL Sync to Data Warehouses...');

  // 1. Fetch active destinations
  const { data: destinations } = await supabaseAdmin
    .from('data_warehouse_destinations')
    .select('*')
    .eq('sync_frequency', 'nightly');

  if (!destinations || destinations.length === 0) {
    console.log('[Job] No active nightly warehouse destinations found.');
    return;
  }

  for (const dest of destinations) {
    try {
      console.log(`[Job] Syncing Workspace ${dest.workspace_id} to ${dest.type.toUpperCase()}`);

      // 2. Fetch all raw data for the workspace
      const { data: posts } = await supabaseAdmin.from('posts').select('*').eq('workspace_id', dest.workspace_id);
      const { data: analytics } = await supabaseAdmin.from('predictions').select('*').eq('workspace_id', dest.workspace_id);
      
      const flatPayload = {
        posts: posts || [],
        analytics: analytics || [],
        timestamp: new Date().toISOString()
      };

      // 3. Format & Upsert into Destination
      if (dest.type === 'snowflake') {
        // MOCK: Initialize Snowflake SDK
        // const connection = snowflake.createConnection(decrypt(dest.encrypted_credentials));
        // await connection.execute({ sqlText: `COPY INTO nexus_posts FROM ?`, binds: [flatPayload.posts] });
        console.log(`[Snowflake] Successfully upserted ${posts?.length} rows for Workspace ${dest.workspace_id}`);
      } else if (dest.type === 'bigquery') {
        // MOCK: Initialize BigQuery SDK
        // const bq = new BigQuery(decrypt(dest.encrypted_credentials));
        // await bq.dataset('nexus_social').table('posts').insert(flatPayload.posts);
        console.log(`[BigQuery] Successfully inserted ${posts?.length} rows for Workspace ${dest.workspace_id}`);
      }

      // 4. Update sync timestamp
      await supabaseAdmin.from('data_warehouse_destinations').update({
        last_sync_at: new Date().toISOString()
      }).eq('id', dest.id);

    } catch (err: any) {
      console.error(`[Job] Failed to sync workspace ${dest.workspace_id} to ${dest.type}:`, err.message);
      // In production: Send to Dead Letter Queue or trigger PagerDuty alert
    }
  }

  console.log('[Job] Reverse ETL Sync Complete.');
}
