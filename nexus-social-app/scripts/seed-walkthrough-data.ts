/**
 * Idempotent sample data for local/product walkthrough.
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
 * Provisions demo@nexussocial.io (email-confirmed) unless SEED_DEMO_USER=false
 *
 * Usage: npx ts-node scripts/seed-walkthrough-data.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(relativePath: string, override: boolean) {
  const full = join(scriptDir, '..', relativePath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env', false);
loadEnvFile('.env.local', true);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceKey) {
  console.error('[seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const WALKTHROUGH_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

const DEMO_WALKTHROUGH_EMAIL = 'demo@nexussocial.io';
const DEMO_WALKTHROUGH_PASSWORD = 'DemoWalk2026!';

async function ensureDemoAuthUser(): Promise<string | null> {
  if (process.env.SEED_DEMO_USER === 'false') {
    return null;
  }

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    console.warn('[seed] Could not list auth users:', listError.message);
    return null;
  }

  const existing = listed.users.find((u) => u.email?.toLowerCase() === DEMO_WALKTHROUGH_EMAIL);
  let userId = existing?.id ?? null;

  if (!userId) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_WALKTHROUGH_EMAIL,
      password: DEMO_WALKTHROUGH_PASSWORD,
      email_confirm: true,
    });
    if (createError) {
      console.warn('[seed] Could not create demo auth user:', createError.message);
      return null;
    }
    userId = created.user.id;
    console.log('[seed] Created demo auth user:', DEMO_WALKTHROUGH_EMAIL);
  } else {
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: DEMO_WALKTHROUGH_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      console.warn('[seed] Could not refresh demo auth password:', updateError.message);
    } else {
      console.log('[seed] Demo auth user ready:', DEMO_WALKTHROUGH_EMAIL);
    }
  }

  const { error: userRowError } = await supabase.from('users').upsert(
    { id: userId, email: DEMO_WALKTHROUGH_EMAIL },
    { onConflict: 'id' },
  );
  if (userRowError) {
    console.warn('[seed] users row for demo account:', userRowError.message);
  }

  return userId;
}


async function resolveUserId(): Promise<string | null> {
  const fromEnv = process.env.WALKTHROUGH_USER_ID ?? process.env.NEXT_PUBLIC_USER_ID;
  if (fromEnv) {
    const { data, error } = await supabase.from('users').select('id').eq('id', fromEnv).maybeSingle();
    if (error) {
      console.warn('[seed] Could not verify WALKTHROUGH_USER_ID:', error.message);
    } else if (data?.id) {
      return data.id;
    } else {
      console.warn('[seed] WALKTHROUGH_USER_ID not in users table â€” using first available user instead.');
    return null;
  }
  }

  const { data, error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.warn('[seed] Could not query users table:', error.message);
    return null;
  }
  return data?.[0]?.id ?? null;
}

async function main() {
  const demoUserId = await ensureDemoAuthUser();
  const userId = demoUserId ?? (await resolveUserId());
  if (!userId) {
    console.warn('[seed] No user id found. Set WALKTHROUGH_USER_ID in .env.local to your Supabase auth user UUID.');
    console.warn('[seed] Skipping membership seed; run again after first login creates a users row.');
  }

  console.log('[seed] Upserting walkthrough workspace...');
  const { error: wsError } = await supabase.from('workspaces').upsert(
    {
      id: WALKTHROUGH_WORKSPACE_ID,
      name: 'Walkthrough Demo',
      slug: 'walkthrough-demo',
      meta_app_review_status: 'approved',
    },
    { onConflict: 'id' },
  );
  if (wsError) throw wsError;

  if (userId) {
    const { error: memberError } = await supabase.from('workspace_members').upsert(
      {
        user_id: userId,
        workspace_id: WALKTHROUGH_WORKSPACE_ID,
        role: 'owner',
      },
      { onConflict: 'user_id,workspace_id' },
    );
    if (memberError) throw memberError;
  }

  console.log('[seed] Upserting AI agent config + inbox map...');
  const { error: aiError } = await supabase.from('ai_agent_configs').upsert(
    {
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      dify_app_id: process.env.DIFY_APP_ID ?? 'walkthrough-app',
      dify_dataset_id: process.env.DIFY_DATASET_ID ?? 'walkthrough-dataset',
      dify_app_api_key: process.env.DIFY_API_KEY ?? '',
      persona_name: 'Walkthrough Agent',
      is_active: true,
      is_globally_disabled: false,
      traffic_allocation_percentage: 100,
    },
    { onConflict: 'workspace_id' },
  );
  if (aiError) console.warn('[seed] ai_agent_configs:', aiError.message);

  const { error: mapError } = await supabase.from('chatwoot_inbox_workspace_map').upsert(
    {
      chatwoot_inbox_id: 1,
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      ai_bot_user_id: 1,
    },
    { onConflict: 'chatwoot_inbox_id' },
  );
  if (mapError) console.warn('[seed] chatwoot_inbox_workspace_map:', mapError.message);

  const { error: creditError } = await supabase.from('ai_credit_ledger').upsert(
    {
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      total_credits: 1000,
      used_credits: 0,
    },
    { onConflict: 'workspace_id' },
  );
  if (creditError) console.warn('[seed] ai_credit_ledger:', creditError.message);

  console.log('[seed] Inserting sample posts...');
  const publishedContent = {
    text: 'Welcome to Nexus Social walkthrough — your AI-native social hub.',
  };

  const { data: publishedPost, error: pubUpsertErr } = await supabase
    .from('posts')
    .upsert(
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        workspace_id: WALKTHROUGH_WORKSPACE_ID,
        status: 'published',
        platforms: ['twitter', 'linkedin'],
        content: publishedContent,
        external_post_id: 'demo-external-walkthrough-001',
        published_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id')
    .single();

  if (pubUpsertErr) {
    const { error: p1 } = await supabase.from('posts').insert({
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      status: 'published',
      platforms: ['twitter', 'linkedin'],
      content: publishedContent,
      external_post_id: 'demo-external-walkthrough-001',
    });
    if (p1) console.warn('[seed] published post:', p1.message);
  }

  const publishedPostId = publishedPost?.id ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const { error: p2 } = await supabase.from('posts').insert({
    workspace_id: WALKTHROUGH_WORKSPACE_ID,
    status: 'scheduled',
    platforms: ['instagram'],
    content: { text: 'Scheduled product launch teaser.' },
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
  });
  if (p2) console.warn('[seed] post 2:', p2.message);

  const { error: p3 } = await supabase.from('posts').insert({
    workspace_id: WALKTHROUGH_WORKSPACE_ID,
    status: 'draft',
    platforms: ['facebook'],
    content: { text: 'Draft post for calendar review.' },
  });
  if (p3) console.warn('[seed] post 3:', p3.message);

  console.log('[seed] Inserting sentiment + CSAT samples...');
  await supabase.from('sentiment_metrics').insert({
    workspace_id: WALKTHROUGH_WORKSPACE_ID,
    message_id: 'walkthrough-msg-1',
    sentiment_score: 'POSITIVE',
    user_query: 'Love the new dashboard!',
  });
  await supabase.from('csat_scores').insert({
    workspace_id: WALKTHROUGH_WORKSPACE_ID,
    conversation_id: '1001',
    score: 5,
  });

  console.log('[seed] Inserting reputation samples...');
  const { data: existingQuery } = await supabase
    .from('listening_queries')
    .select('id')
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID)
    .eq('query_text', 'Nexus Social')
    .maybeSingle();

  let queryId = existingQuery?.id;
  if (!queryId) {
    const { data: inserted, error: queryErr } = await supabase
      .from('listening_queries')
      .insert({ workspace_id: WALKTHROUGH_WORKSPACE_ID, query_text: 'Nexus Social' })
      .select('id')
      .single();
    if (queryErr) {
      console.warn('[seed] listening_queries:', queryErr.message);
    } else {
      queryId = inserted?.id;
    }
  }

  if (queryId) {
    await supabase.from('mentions').insert({
      query_id: queryId,
      source_platform: 'twitter',
      content: 'Just tried Nexus Social â€” impressive AI inbox!',
      author_name: 'Demo User',
      author_url: 'https://twitter.com/demo',
      sentiment: 'Positive',
    });
  }

  const { error: reviewErr } = await supabase.from('external_reviews').insert({
    workspace_id: WALKTHROUGH_WORKSPACE_ID,
    platform: 'google',
    rating: 5,
    author_name: 'Happy Customer',
    review_text: 'Great social media management platform. Highly recommend!',
    status: 'pending',
  });
  if (reviewErr) console.warn('[seed] external_reviews:', reviewErr.message);

  console.log('[seed] Inserting sample automation flow...');
  const { count } = await supabase
    .from('automation_flows')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID);

  if (!count) {
    const { error: flowErr } = await supabase.from('automation_flows').insert({
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      name: 'Walkthrough Keyword Reply',
      trigger_type: 'comment',
      flow_json: {
        nodes: [
          { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Comment Trigger' } },
          { id: 'n2', type: 'action', position: { x: 0, y: 120 }, data: { label: 'Auto Reply' } },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      },
      is_active: false,
    });
    if (flowErr) console.warn('[seed] automation_flows:', flowErr.message);
  }

  console.log('[seed] Seeding post analytics + social connection...');
  const { encryptToken } = await import('../src/lib/crypto/token-vault');
  const encrypted = encryptToken('sandbox-demo-connection-token');

  await supabase
    .from('workspace_social_connections')
    .update({ disconnected_at: new Date().toISOString() })
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID)
    .eq('platform', 'facebook')
    .is('disconnected_at', null);

  const { count: connCount } = await supabase
    .from('workspace_social_connections')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID)
    .eq('platform', 'facebook')
    .is('disconnected_at', null);

  if (!connCount) {
    const { error: connErr } = await supabase.from('workspace_social_connections').insert({
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      platform: 'facebook',
      account_id: 'demo-page-walkthrough',
      account_name: 'Walkthrough Facebook Page',
      access_token_enc: encrypted.ciphertext,
      token_iv: encrypted.iv,
      token_tag: encrypted.tag,
      scopes: ['pages_manage_posts'],
      metadata: { seeded_by: 'seed-walkthrough-data.ts' },
    });
    if (connErr) console.warn('[seed] workspace_social_connections:', connErr.message);
  }

  const { error: analyticsErr } = await supabase.from('post_analytics').upsert(
    {
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      post_id: publishedPostId,
      platform: 'linkedin',
      external_post_id: 'demo-external-walkthrough-001',
      impressions: 12500,
      reach: 9800,
      clicks: 420,
      likes: 890,
      comments: 56,
      shares: 34,
      engagement_rate: 0.0789,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'post_id,platform,external_post_id' },
  );
  if (analyticsErr) console.warn('[seed] post_analytics:', analyticsErr.message);

  if (userId) {
    const { error: notifErr } = await supabase.from('user_notifications').upsert(
      {
        id: 'demo-welcome',
        user_id: userId,
        workspace_id: WALKTHROUGH_WORKSPACE_ID,
        title: 'Welcome to Walkthrough Demo',
        body: 'Sample posts, analytics, and AI agent are ready. Explore Calendar and Inbox.',
        href: '/calendar',
        read: false,
      },
      { onConflict: 'user_id,workspace_id,id' },
    );
    if (notifErr) console.warn('[seed] user_notifications:', notifErr.message);
  }

  const { count: reportCount } = await supabase
    .from('custom_reports')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID);

  if (!reportCount) {
    const { error: reportErr } = await supabase.from('custom_reports').insert({
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      name: 'Walkthrough Executive Summary',
      layout: [
        { type: 'kpi', metric: 'published_posts', label: 'Posts Published' },
        { type: 'kpi', metric: 'total_engagement', label: 'Total Engagement' },
      ],
    });
    if (reportErr) console.warn('[seed] custom_reports:', reportErr.message);
  }

  console.log('[seed] Done.');
  console.log(`  Workspace ID: ${WALKTHROUGH_WORKSPACE_ID}`);
  console.log(`  Demo login:   ${DEMO_WALKTHROUGH_EMAIL} / ${DEMO_WALKTHROUGH_PASSWORD}`);
  console.log('  Set NEXT_PUBLIC_DEFAULT_WORKSPACE_ID to this value in .env.local for UI defaults.');
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});

