import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AiCmoNav } from '../AiCmoNav';
import { AbmDashboardClient } from './AbmDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AbmPage() {
  const t = await getTranslations('Abm');
  const tNav = await getTranslations('Nav');

  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <Link href="/ai-ops" className="text-sm text-indigo-600 hover:underline">
          {tNav('backToAiOps')}
        </Link>
      </div>
      <AbmDashboardClient />
    </section>
  );
}
