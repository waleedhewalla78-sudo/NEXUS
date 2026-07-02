'use client';

import Link from 'next/link';
import {
  BarChart3,
  Brain,
  Calendar,
  HeartPulse,
  LayoutDashboard,
  Mail,
  PenSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DashboardData } from '@/actions/dashboard';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function DashboardHome({ data }: { data: DashboardData }) {
  const t = useTranslations('Dashboard');

  const quickActions = [
    { href: '/posts/create', label: t('createPost'), icon: PenSquare, color: 'bg-indigo-600' },
    { href: '/calendar', label: t('calendar'), icon: Calendar, color: 'bg-emerald-600' },
    { href: '/inbox', label: t('inbox'), icon: Mail, color: 'bg-sky-600' },
    { href: '/analytics', label: t('analytics'), icon: BarChart3, color: 'bg-violet-600' },
  ];

  const analyticsReports = [
    {
      href: '/analytics',
      label: t('performanceDashboard'),
      description: t('performanceDashboardDesc'),
      icon: BarChart3,
      color: 'bg-violet-600',
    },
    {
      href: '/analytics/sentiment',
      label: t('sentimentAnalysis'),
      description: t('sentimentAnalysisDesc'),
      icon: HeartPulse,
      color: 'bg-rose-600',
    },
    {
      href: '/analytics/ai-performance',
      label: t('aiPerformance'),
      description: t('aiPerformanceDesc'),
      icon: Brain,
      color: 'bg-indigo-600',
    },
    {
      href: '/reports/builder',
      label: t('customReportBuilder'),
      description: t('customReportBuilderDesc'),
      icon: LayoutDashboard,
      color: 'bg-emerald-600',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div id="dashboard-welcome" className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <p className="text-indigo-100 text-sm font-medium mb-1">{data.workspaceName}</p>
        <h1 className="text-3xl font-bold mb-2">{t('welcomeBack', { name: data.userName })}</h1>
        <p className="text-indigo-100 max-w-xl">{t('subtitle')}</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition"
            >
              <span className={`${color} rounded-xl p-3 text-white`}>
                <Icon className="w-6 h-6" />
              </span>
              <span className="font-medium text-gray-900">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalPosts')} value={data.stats.totalPosts} />
        <StatCard label={t('published')} value={data.stats.publishedPosts} />
        <StatCard label={t('drafts')} value={data.stats.draftPosts} />
        <StatCard label={t('scheduled')} value={data.stats.scheduledPosts} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-500" />
          {t('analyticsReports')}
        </h2>
        <p className="text-sm text-gray-500 mb-4">{t('analyticsReportsHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsReports.map(({ href, label, description, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition"
            >
              <span className={`${color} shrink-0 self-start rounded-xl p-3 text-white`}>
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{label}</p>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              {t('recentActivity')}
            </h2>
            <Link href="/calendar" className="text-sm text-indigo-600 hover:underline">
              {t('viewCalendar')}
            </Link>
          </div>
          {data.recentPosts.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {t('noPostsYet')}{' '}
              <Link href="/posts/create" className="text-indigo-600 hover:underline">
                {t('createFirstPost')}
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentPosts.map((post) => (
                <li key={post.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{post.text || t('untitledPost')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {post.platforms.join(', ') || t('noPlatforms')} ·{' '}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                    {post.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('announcements')}</h2>
          <ul className="space-y-3">
            {data.announcements.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg p-3 text-sm ${
                  item.type === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-indigo-50 text-indigo-900'
                }`}
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 opacity-80">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
