"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/store/workspace';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SentimentDashboard() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [data, setData] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    if (!workspaceId) return;

    async function loadMetrics() {
      const { data: metrics } = await supabase
        .from('sentiment_metrics')
        .select('sentiment_score')
        .eq('workspace_id', workspaceId);

      if (metrics) {
        const counts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, URGENT: 0 };
        metrics.forEach((m) => {
          if (counts[m.sentiment_score as keyof typeof counts] !== undefined) {
            counts[m.sentiment_score as keyof typeof counts]++;
          }
        });

        setData([
          { name: 'POSITIVE', count: counts.POSITIVE },
          { name: 'NEUTRAL', count: counts.NEUTRAL },
          { name: 'NEGATIVE', count: counts.NEGATIVE },
          { name: 'URGENT', count: counts.URGENT },
        ]);
      }
    }

    loadMetrics();
  }, [workspaceId]);

  const colors = {
    POSITIVE: '#10B981',
    NEUTRAL: '#6B7280',
    NEGATIVE: '#F59E0B',
    URGENT: '#EF4444',
  };

  if (!workspaceId) {
    return <p className="p-8 text-muted-foreground">Select a workspace to view sentiment metrics.</p>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Social Listening & Sentiment</h1>
      <p className="text-muted-foreground">Real-time AI analysis of incoming customer conversations.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <Card key={item.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.name} Sentiments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="col-span-4 mt-8">
        <CardHeader>
          <CardTitle>Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name as keyof typeof colors]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
