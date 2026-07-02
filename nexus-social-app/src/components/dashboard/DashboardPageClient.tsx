'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useWorkspaceStore } from '@/store/workspace';
import DashboardHome from '@/components/dashboard/DashboardHome';
import { getDashboardData, type DashboardData } from '@/actions/dashboard';

export default function DashboardPageClient() {
  const t = useTranslations('Dashboard');
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const bootstrapping = useWorkspaceStore((s) => s.bootstrapping);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || bootstrapping) return;
    getDashboardData(workspaceId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'));
  }, [workspaceId, bootstrapping]);

  if (bootstrapping || (!data && !error && workspaceId)) {
    return <p className="text-gray-500">{t('loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-gray-500">{t('selectWorkspace')}</p>;
  }

  return <DashboardHome data={data} />;
}
