import Link from 'next/link';
import { AttributionDashboardClient } from './AttributionDashboardClient';

export const dynamic = 'force-dynamic';

export default function AttributionPage() {
  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Touch Attribution</h1>
          <p className="text-gray-600 mt-1">
            First-touch · last-touch · linear models tied to CRM closed-won revenue
          </p>
        </div>
        <Link href="/ai-cmo/abm" className="text-sm text-indigo-600 hover:underline">
          ABM accounts →
        </Link>
      </div>
      <AttributionDashboardClient />
    </section>
  );
}
