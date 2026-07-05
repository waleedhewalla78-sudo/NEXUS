import { redirect } from 'next/navigation';
import DashboardPageClient from '@/components/dashboard/DashboardPageClient';
import { isSaasUiEnabled } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  if (!isSaasUiEnabled()) {
    redirect('/intelligence');
  }
  return <DashboardPageClient />;
}
