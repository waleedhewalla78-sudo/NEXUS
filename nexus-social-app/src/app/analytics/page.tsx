import React from 'react';
import type { Metadata } from 'next';
import { getAnalytics } from '@/actions/getAnalytics';
import AnalyticsDashboard from '@/app/analytics/AnalyticsDashboard';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';

export const metadata: Metadata = {
  title: 'Analytics – Nexus Social',
  description: 'View your social media performance metrics, engagement trends, and platform distribution analytics.',
};

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  let analytics;

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-supabase-url')) {
      analytics = await getAnalytics({
        workspaceId: process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '',
        userId: process.env.NEXT_PUBLIC_USER_ID ?? '',
      });
    } else {
      const { workspaceId, userId } = await getUserWorkspaceContext();
      analytics = await getAnalytics({ workspaceId, userId });
    }
  } catch {
    return (
      <div className="p-8 text-gray-600">
        Unable to load analytics. Verify workspace membership and database configuration.
      </div>
    );
  }

  const hasPostData = analytics.totalPosts > 0;
  const hasEngagementData =
    (analytics.engagement?.totalImpressions ?? 0) > 0 ||
    (analytics.engagement?.totalEngagement ?? 0) > 0;

  if (!hasPostData && !hasEngagementData) {
    return (
      <div className="p-8 text-gray-600">
        No analytics data yet. Publish posts with connected accounts; metrics sync every 6 hours.
      </div>
    );
  }

  return <AnalyticsDashboard data={analytics} />;
}
