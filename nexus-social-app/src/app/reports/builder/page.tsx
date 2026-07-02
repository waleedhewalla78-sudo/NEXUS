'use client';

import React, { useEffect, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { toast } from 'react-hot-toast';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWorkspaceStore } from '@/store/workspace';
import {
  getReportData,
  saveReportLayout,
  type ReportLayoutItem,
} from '@/actions/reports';
import type { AnalyticsResult } from '@/actions/getAnalytics';

function WidgetPreview({ widgetId, analytics }: { widgetId: string; analytics: AnalyticsResult }) {
  if (widgetId === 'engagement' || widgetId === 'a') {
    const engagementRows = analytics.engagement?.overTime ?? [];
    if (engagementRows.length > 0) {
      return (
        <ul className="text-sm text-slate-300 space-y-1">
          {engagementRows.slice(-5).map((row) => (
            <li key={row.date}>
              {row.date}: {row.impressions} impressions, {row.engagement} engagement
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p className="text-sm text-slate-500 italic">
        No ingested engagement metrics yet. Publish posts and run analytics sync.
      </p>
    );
  }
  if (widgetId === 'platforms' || widgetId === 'b') {
    const engagementPlatforms = analytics.engagement?.byPlatform ?? [];
    if (engagementPlatforms.length > 0) {
      return (
        <ul className="text-sm text-slate-300 space-y-1">
          {engagementPlatforms.map((p) => (
            <li key={p.platform}>
              {p.platform}: {p.impressions} impressions, {p.engagement} engagement
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p className="text-sm text-slate-500 italic">
        No ingested platform engagement yet.
      </p>
    );
  }
  return (
    <div className="text-sm text-slate-300 space-y-1">
      <p>Total posts: {analytics.totalPosts}</p>
      <p>Published: {analytics.publishedPosts}</p>
      <p>Drafts: {analytics.draftPosts}</p>
      {analytics.engagement ? (
        <>
          <p>Impressions: {analytics.engagement.totalImpressions}</p>
          <p>Engagement: {analytics.engagement.totalEngagement}</p>
        </>
      ) : null}
    </div>
  );
}

export default function ReportBuilderPage() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [layout, setLayout] = useState<ReportLayoutItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    getReportData(workspaceId)
      .then(({ layout: savedLayout, analytics: data }) => {
        setLayout(savedLayout);
        setAnalytics(data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleLayoutChange = (newLayout: ReportLayoutItem[]) => {
    setLayout(newLayout);
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await saveReportLayout(workspaceId, layout);
      toast.success('Report layout saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 min-h-screen bg-[#0f172a] text-white">Loading report builder…</div>;
  }

  return (
    <div className="p-8 min-h-screen bg-[#0f172a] text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-slate-400">Widgets show live analytics from your workspace.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Layout'}
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <GridLayout
          {...({
            className: 'layout',
            layout,
            rowHeight: 60,
            width: 1000,
            onLayoutChange: handleLayoutChange,
            isDraggable: true,
            isResizable: true,
          } as any)}
        >
          {layout.map((w) => (
            <div key={w.i} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col cursor-move">
              <h3 className="font-semibold text-slate-300 border-b border-white/10 pb-2 mb-2">{w.title}</h3>
              <div className="flex-1 overflow-auto">
                {analytics ? (
                  <WidgetPreview widgetId={w.i} analytics={analytics} />
                ) : (
                  <p className="text-slate-500 text-sm italic">No analytics data</p>
                )}
              </div>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
