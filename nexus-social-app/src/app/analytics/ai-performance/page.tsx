'use client';

import { useEffect, useState } from 'react';
import { getAiAnalytics } from '@/actions/get-ai-analytics';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Brain, Gauge, Users } from 'lucide-react';

export default function AiPerformanceDashboard({ params }: { params: { workspaceId: string } }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback workspaceId for local dev if params missing
  const workspaceId = params?.workspaceId || '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    async function load() {
      try {
        const stats = await getAiAnalytics(workspaceId);
        setData(stats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspaceId]);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading AI Performance Metrics...</div>;
  }

  const totals = data.reduce((acc, curr) => {
    acc.totalConvs += curr.total_conversations || 0;
    acc.avgConf += curr.avg_confidence || 0;
    acc.humanEdits += curr.human_edit_rate || 0;
    return acc;
  }, { totalConvs: 0, avgConf: 0, humanEdits: 0 });

  const numDays = data.length || 1;
  const overallConf = (totals.avgConf / numDays * 100).toFixed(1);
  const overallEditRate = (totals.humanEdits / numDays * 100).toFixed(1);

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Performance & QA</h1>
        <p className="text-muted-foreground">Monitor the LLM-as-a-Judge evaluations and human feedback loops.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total AI Conversations</CardTitle>
            <Brain className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalConvs}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Auto-Resolution Rate</CardTitle>
            <Users className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{100 - parseFloat(overallEditRate)}%</div>
            <p className="text-xs text-muted-foreground">Zero-touch resolutions</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
            <Gauge className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallConf}%</div>
            <p className="text-xs text-muted-foreground">RAG Context Quality</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Human Edit Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overallEditRate}%</div>
            <p className="text-xs text-muted-foreground">Escalations & rewrites</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle>AI Activity vs Human Edits</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" name="Total Convs" dataKey="total_conversations" stroke="var(--brand-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Edit Rate" dataKey="human_edit_rate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle>LLM-as-a-Judge QA Scores</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend />
                <Bar name="Accuracy Score" dataKey="avg_accuracy" fill="var(--brand-secondary)" radius={[4, 4, 0, 0]} />
                <Bar name="Tone Score" dataKey="avg_tone" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
