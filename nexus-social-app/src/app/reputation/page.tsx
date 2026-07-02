import React from 'react';
import type { Metadata } from 'next';
import ReputationDashboard from './ReputationDashboard';
import { ReputationSettings } from './ReputationSettings';
import {
  fetchListeningQueries,
  fetchMentions,
  fetchReviews,
} from '@/actions/reputation';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';

export const metadata: Metadata = {
  title: 'Reputation Management – Nexus Social',
  description: 'Monitor social listening mentions and manage external reviews.',
};

export const dynamic = 'force-dynamic';

export default async function ReputationPage() {
  const { workspaceId, userId } = await getUserWorkspaceContext();

  const [queries, mentions, reviews] = await Promise.all([
    fetchListeningQueries(workspaceId, userId),
    fetchMentions(workspaceId, userId),
    fetchReviews(workspaceId, userId),
  ]);

  return (
    <section
      className="p-6 md:p-10 min-h-screen text-white"
      style={{
        background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 40%, #16213e 100%)',
      }}
    >
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Reputation Management</h1>
        <p className="text-gray-400 text-base max-w-2xl">
          Monitor brand mentions across the web and respond to external reviews to maintain a strong brand image.
        </p>
      </div>

      <ReputationSettings
        workspaceId={workspaceId}
        userId={userId}
        initialQueries={queries}
      />

      <ReputationDashboard
        initialMentions={mentions}
        initialReviews={reviews}
        workspaceId={workspaceId}
        userId={userId}
      />
    </section>
  );
}
