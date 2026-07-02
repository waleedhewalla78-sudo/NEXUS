-- Extend get_workspace_analytics to aggregate ingested post_analytics metrics
CREATE OR REPLACE FUNCTION public.get_workspace_analytics(p_workspace_id uuid)
RETURNS TABLE (
    total_posts bigint,
    published_posts bigint,
    draft_posts bigint,
    posts_by_platform jsonb,
    posts_over_time jsonb,
    total_impressions bigint,
    total_reach bigint,
    total_engagement bigint,
    engagement_by_platform jsonb,
    engagement_over_time jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::bigint                                          AS total_posts,
    count(*) FILTER (WHERE p.status = 'published')::bigint    AS published_posts,
    count(*) FILTER (WHERE p.status = 'draft')::bigint        AS draft_posts,

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
    ) AS posts_over_time,

    COALESCE((
      SELECT sum(COALESCE(pa.impressions, 0))::bigint
      FROM post_analytics pa
      WHERE pa.workspace_id = p_workspace_id
    ), 0)::bigint AS total_impressions,

    COALESCE((
      SELECT sum(COALESCE(pa.reach, 0))::bigint
      FROM post_analytics pa
      WHERE pa.workspace_id = p_workspace_id
    ), 0)::bigint AS total_reach,

    COALESCE((
      SELECT sum(
        COALESCE(pa.likes, 0) +
        COALESCE(pa.comments, 0) +
        COALESCE(pa.shares, 0) +
        COALESCE(pa.saves, 0)
      )::bigint
      FROM post_analytics pa
      WHERE pa.workspace_id = p_workspace_id
    ), 0)::bigint AS total_engagement,

    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'platform', sub.platform,
            'impressions', sub.impressions,
            'engagement', sub.engagement
          )
        )
        FROM (
          SELECT
            pa.platform,
            sum(COALESCE(pa.impressions, 0)) AS impressions,
            sum(
              COALESCE(pa.likes, 0) +
              COALESCE(pa.comments, 0) +
              COALESCE(pa.shares, 0) +
              COALESCE(pa.saves, 0)
            ) AS engagement
          FROM post_analytics pa
          WHERE pa.workspace_id = p_workspace_id
          GROUP BY pa.platform
          ORDER BY impressions DESC
        ) sub
      ),
      '[]'::jsonb
    ) AS engagement_by_platform,

    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', sub.day::text,
            'impressions', sub.impressions,
            'engagement', sub.engagement
          )
          ORDER BY sub.day
        )
        FROM (
          SELECT
            date_trunc('day', pa.synced_at)::date AS day,
            sum(COALESCE(pa.impressions, 0)) AS impressions,
            sum(
              COALESCE(pa.likes, 0) +
              COALESCE(pa.comments, 0) +
              COALESCE(pa.shares, 0) +
              COALESCE(pa.saves, 0)
            ) AS engagement
          FROM post_analytics pa
          WHERE pa.workspace_id = p_workspace_id
            AND pa.synced_at IS NOT NULL
            AND pa.synced_at >= now() - interval '30 days'
          GROUP BY day
          ORDER BY day
        ) sub
      ),
      '[]'::jsonb
    ) AS engagement_over_time

  FROM posts p
  WHERE p.workspace_id = p_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_analytics(uuid) TO anon, authenticated;
