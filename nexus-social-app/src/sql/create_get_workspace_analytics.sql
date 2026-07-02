-- --------------------------------------------------------------------------
-- Supabase RPC: get_workspace_analytics
-- --------------------------------------------------------------------------
-- Returns a single-row result with aggregated metrics for a workspace.
-- Used by the analytics dashboard via: supabase.rpc('get_workspace_analytics', { p_workspace_id })
--
-- Prerequisites:
--   - Table `posts` with columns: id, workspace_id, status, platforms (text[]),
--     content (jsonb), scheduled_at, created_at, updated_at
--   - Table `workspace_members` with columns: id, user_id, workspace_id, role
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_workspace_analytics(p_workspace_id uuid)
RETURNS TABLE (
    total_posts     bigint,
    published_posts bigint,
    draft_posts     bigint,
    posts_by_platform jsonb,
    posts_over_time   jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total counts
    count(*)::bigint                                          AS total_posts,
    count(*) FILTER (WHERE p.status = 'published')::bigint    AS published_posts,
    count(*) FILTER (WHERE p.status = 'draft')::bigint        AS draft_posts,

    -- Posts grouped by platform (unnest the text[] column)
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('platform', sub.platform, 'count', sub.cnt)
        )
        FROM (
          SELECT unnest(p2.platforms) AS platform, count(*) AS cnt
          FROM posts p2
          WHERE p2.workspace_id = p_workspace_id
          GROUP BY platform
          ORDER BY cnt DESC
        ) sub
      ),
      '[]'::jsonb
    ) AS posts_by_platform,

    -- Posts grouped by day (last 30 days)
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('date', sub.day::text, 'count', sub.cnt)
          ORDER BY sub.day
        )
        FROM (
          SELECT date_trunc('day', p3.created_at)::date AS day, count(*) AS cnt
          FROM posts p3
          WHERE p3.workspace_id = p_workspace_id
            AND p3.created_at >= now() - interval '30 days'
          GROUP BY day
          ORDER BY day
        ) sub
      ),
      '[]'::jsonb
    ) AS posts_over_time

  FROM posts p
  WHERE p.workspace_id = p_workspace_id;
END;
$$;

-- Performance index
CREATE INDEX IF NOT EXISTS idx_posts_workspace_created
  ON posts (workspace_id, created_at DESC);

-- Grant execute to the anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_workspace_analytics(uuid) TO anon, authenticated;
