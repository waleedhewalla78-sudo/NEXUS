// src/app/analytics/AnalyticsDashboard.tsx
'use client';

import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  FileEdit,
  TrendingUp,
  Activity,
  Clock,
  HeartPulse,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  CartesianGrid,
} from 'recharts';
import dynamic from 'next/dynamic';

const ExportButton = dynamic(() => import('@/components/ExportButton'), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AnalyticsData = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  postsByPlatform: { platform: string; count: number }[];
  postsOverTime: { date: string; count: number }[];
  predictions?: {
    optimalTimes: string[];
    churnScore: number;
  };
};

interface Props {
  data: AnalyticsData;
}

// ---------------------------------------------------------------------------
// Animated KPI Card
// ---------------------------------------------------------------------------
const KpiCard = ({
  title,
  value,
  icon,
  accent,
  index,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  index: number;
}) => (
  <div
    className="relative overflow-hidden flex items-center gap-4 rounded-2xl p-6 border border-white/10 transition-all duration-300 hover:scale-[1.03] hover:border-white/25"
    style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      animationDelay: `${index * 100}ms`,
    }}
  >
    {/* Gradient glow behind icon */}
    <div
      className="absolute -top-6 -left-6 w-24 h-24 rounded-full opacity-30 blur-2xl"
      style={{ background: accent }}
    />
    <div
      className="relative z-10 flex items-center justify-center w-12 h-12 rounded-xl"
      style={{ background: `${accent}33` }}
    >
      {icon}
    </div>
    <div className="relative z-10">
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Section wrapper (glass card)
// ---------------------------------------------------------------------------
const GlassCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:border-white/20 ${className}`}
    style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-2 border border-white/10 text-sm shadow-xl"
      style={{
        background: 'rgba(15, 15, 25, 0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} posts</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
const AnalyticsDashboard: React.FC<Props> = ({ data }) => {
  const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e879f9'];

  const engagementRate =
    data.totalPosts > 0
      ? ((data.publishedPosts / data.totalPosts) * 100).toFixed(1)
      : '0';

  return (
    <section
      className="p-6 md:p-10 min-h-screen text-white"
      style={{
        background:
          'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 40%, #16213e 100%)',
      }}
    >
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-7 h-7 text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
          </div>
          <p className="text-gray-400 text-base max-w-xl">
            Track your social media performance across all connected platforms.
            Monitor trends, engagement, and content distribution in real time.
          </p>
        </div>
        
        {/* Export Action */}
        <div>
          <ExportButton data={data} date={new Date().toLocaleDateString()} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <KpiCard
          title="Total Posts"
          value={data.totalPosts}
          icon={<BarChart3 className="w-6 h-6 text-indigo-400" />}
          accent="#6366f1"
          index={0}
        />
        <KpiCard
          title="Published"
          value={data.publishedPosts}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          accent="#10b981"
          index={1}
        />
        <KpiCard
          title="Drafts"
          value={data.draftPosts}
          icon={<FileEdit className="w-6 h-6 text-amber-400" />}
          accent="#f59e0b"
          index={2}
        />
        <KpiCard
          title="Publish Rate"
          value={`${engagementRate}%`}
          icon={<TrendingUp className="w-6 h-6 text-fuchsia-400" />}
          accent="#d946ef"
          index={3}
        />
      </div>

      {/* Predictive AI Row */}
      {data.predictions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <GlassCard className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Predicted Optimal Times
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Based on time-series forecasting (Prophet).
              </p>
              <div className="flex gap-3">
                {data.predictions.optimalTimes.map((time, i) => (
                  <div key={i} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 font-bold rounded-lg border border-indigo-500/30">
                    {time}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                Workspace Churn Risk
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Based on engagement & activity (XGBoost Classifier).
              </p>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-rose-400">
                  {data.predictions.churnScore}%
                </div>
                <div className="text-sm font-medium text-gray-400 max-w-[150px]">
                  {data.predictions.churnScore > 50 ? 'High Risk – Action Required' : 'Healthy – Keep it up!'}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Posts Over Time – 60 % */}
        <GlassCard className="lg:col-span-3">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Posts Over Time
          </h2>
          {data.postsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data.postsOverTime}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#colorCount)"
                  dot={{ r: 3, fill: '#818cf8' }}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-gray-500">
              No timeline data available yet.
            </div>
          )}
        </GlassCard>

        {/* Platform Distribution – 40 % */}
        <GlassCard className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Platform Distribution
          </h2>
          {data.postsByPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={data.postsByPlatform}
                  dataKey="count"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                >
                  {data.postsByPlatform.map((_entry, idx) => (
                    <Cell
                      key={idx}
                      fill={COLORS[idx % COLORS.length]}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,15,25,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend
                  wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-gray-500">
              No platform data available yet.
            </div>
          )}
        </GlassCard>
      </div>

      {/* Footer note */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        Data refreshes automatically. Last updated: {new Date().toLocaleString()}
      </div>
    </section>
  );
};

export default AnalyticsDashboard;
